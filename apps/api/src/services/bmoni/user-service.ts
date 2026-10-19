import { randomUUID } from "node:crypto";

import type { UserMappingRepository } from "../../repositories/user-mapping.js";
import type { CreateMoniflowUserInput } from "../../schemas/onboarding.js";
import { BmoniProviderError } from "./errors.js";
import { phoneIdentityFingerprint, phoneIdentityKeyGuard } from "./phone-identity-fingerprint.js";

import type { BmoniGateway } from "./gateway.js";

export class UserMappingConflictError extends Error {
  override readonly name = "UserMappingConflictError";
}

export class UserMappingReconciliationHoldError extends Error {
  override readonly name = "UserMappingReconciliationHoldError";
  constructor(readonly state: "PROVIDER_USER_EXISTS" | "PROVIDER_OUTCOME_UNKNOWN") {
    super("BMONI identity provisioning is on a durable manual reconciliation hold.");
  }
}

export type ProvisionBmoniUserResult = {
  bmoniUserId: string;
  localUserId: string;
  status: "created" | "existing";
};

export type BmoniUserMappingStatus = {
  bmoniUserId: string;
  localUserId: string;
  email: string;
} | null;

export class BmoniUserService {
  constructor(
    private readonly gateway: BmoniGateway,
    private readonly mappings: UserMappingRepository,
    private readonly phoneHmacSecret?: string
  ) {}

  async getMapping(localUserId: string): Promise<BmoniUserMappingStatus> {
    const mapping = await this.mappings.findByLocalUserId(localUserId);
    if (!mapping) return null;
    return { bmoniUserId: mapping.bmoniUserId, email: mapping.email, localUserId: mapping.localUserId };
  }

  /** Returns no email, phone, provider ID or fingerprint to the workspace route. */
  async getReconciliationHold(localUserId: string): Promise<{
    localUserId: string | null;
    state: "PROVIDER_USER_EXISTS" | "PROVIDER_OUTCOME_UNKNOWN";
  } | null> {
    const hold = await this.mappings.findHoldByLocalUserId(localUserId);
    return hold ? { localUserId: hold.localUserId, state: hold.state } : null;
  }

  async createOrFindMapping(input: CreateMoniflowUserInput): Promise<ProvisionBmoniUserResult> {
    // Check durable key continuity before any local identity is returned or
    // any BMONI user-create is even considered. Missing/rotated keys fail shut.
    await this.mappings.assertPhoneKeyContinuity(
      phoneIdentityKeyGuard(this.phoneHmacSecret)
    );
    if (input.localUserId) {
      const localMapping = await this.mappings.findByLocalUserId(input.localUserId);
      if (localMapping) {
        if (localMapping.email.toLowerCase() !== input.email.toLowerCase()) {
          throw new UserMappingConflictError("The local user is already associated with a different BMONI identity.");
        }
        const held=await this.mappings.findHoldByEmail(localMapping.email);
        if (held?.phoneFingerprint &&
            held.phoneFingerprint!==phoneIdentityFingerprint(input.phoneNumber,this.phoneHmacSecret)) {
          throw new UserMappingConflictError("Phone identity does not match the existing verified local mapping.");
        }
        return { bmoniUserId: localMapping.bmoniUserId, localUserId: localMapping.localUserId, status: "existing" };
      }
    }

    const emailMapping = await this.mappings.findByEmail(input.email);
    if (emailMapping) {
      if (input.localUserId && emailMapping.localUserId !== input.localUserId) {
        throw new UserMappingConflictError("The email is already associated with another local user.");
      }
      const held=await this.mappings.findHoldByEmail(emailMapping.email);
      if (held?.phoneFingerprint &&
          held.phoneFingerprint!==phoneIdentityFingerprint(input.phoneNumber,this.phoneHmacSecret)) {
        throw new UserMappingConflictError("Phone identity does not match the existing verified local mapping.");
      }
      return { bmoniUserId: emailMapping.bmoniUserId, localUserId: emailMapping.localUserId, status: "existing" };
    }

    // A previous 409 or uncertain create outcome must never issue another
    // mutation, even if this service was restarted or the user retries.
    const phoneFingerprint=phoneIdentityFingerprint(input.phoneNumber,this.phoneHmacSecret);
    const hold=await this.mappings.findHoldByEmail(input.email);
    if (hold) {
      if (hold.phoneFingerprint && hold.phoneFingerprint!==phoneFingerprint) {
        throw new UserMappingConflictError("A held email has a different phone identity.");
      }
      if (hold.localUserId && input.localUserId && hold.localUserId!==input.localUserId) {
        throw new UserMappingConflictError("A held identity belongs to another local user.");
      }
      throw new UserMappingReconciliationHoldError(hold.state);
    }

    const byPhone=await this.mappings.findHoldByPhoneFingerprint(phoneFingerprint);
    if (byPhone && byPhone.email!==input.email.trim().toLowerCase()) {
      throw new UserMappingConflictError("A different identity has already reserved this phone.");
    }

    const localUserId = input.localUserId ?? randomUUID();
    // The reservation must commit BEFORE the external side effect. A concurrent
    // request in this process or any other process cannot reserve this email
    // or local user ID. If we crash at any later point, the identity remains
    // held for manual reconciliation rather than potentially creating twice.
    const reserved=await this.mappings.reserveBeforeCreate({
      email:input.email.trim().toLowerCase(),
      localUserId,
      phoneFingerprint,
      state:"PROVIDER_OUTCOME_UNKNOWN",
      createdAt:new Date().toISOString()
    });
    if (!reserved) {
      const concurrent=await this.mappings.findHoldByEmail(input.email);
      if (!concurrent || (concurrent.localUserId && concurrent.localUserId!==localUserId) ||
          (concurrent.phoneFingerprint && concurrent.phoneFingerprint!==phoneFingerprint)) {
        throw new UserMappingConflictError("Identity already reserved for a different local account.");
      }
      throw new UserMappingReconciliationHoldError(concurrent.state);
    }

    const compactLocalId = localUserId.replace(/-/g, "");
    const { localUserId: _ignoredLocalUserId, ...providerInputFromRequest } = input;
    const providerInput = {
      ...providerInputFromRequest,
      // BMONI's reference client supplies unique partner identifiers on every
      // sandbox user creation. MONIFlow derives stable equivalents from its own
      // local identity so retries/reconciliation have a deterministic key.
      employeeId: providerInputFromRequest.employeeId ?? `MF-${compactLocalId}`,
      identityId: providerInputFromRequest.identityId ?? `moniflow-${compactLocalId}`
    };

    let user: Awaited<ReturnType<BmoniGateway["createUser"]>>;
    try {
      user=await this.gateway.createUser(providerInput);
    } catch(error) {
      if (error instanceof BmoniProviderError && error.statusCode===409) {
        // The pre-dispatch reservation already protects unknown outcomes.
        // A documented provider 409 can be classified more precisely.
        await this.mappings.markProviderUserExists(input.email);
      }
      // Never delete or auto-release a reservation after ANY provider error.
      // Even a supposedly permanent upstream failure needs human review.
      throw error;
    }
    if (user.email.toLowerCase() !== input.email.toLowerCase()) {
      // Reservation was committed before dispatch and stays in place.
      throw new UserMappingConflictError("The provider response did not preserve the requested identity.");
    }

    const timestamp = new Date().toISOString();
    try {
      const mapping = await this.mappings.save({
        bmoniUserId: user.bmoniUserId,
        createdAt: timestamp,
        email: user.email,
        localUserId,
        updatedAt: timestamp
      });
      return { bmoniUserId: mapping.bmoniUserId, localUserId: mapping.localUserId, status: "created" };
    } catch(error) {
      // Provider may have created a user despite local persistence failing.
      // The committed pre-dispatch hold survives; retrying would be unsafe.
      throw error;
    }
  }
}
