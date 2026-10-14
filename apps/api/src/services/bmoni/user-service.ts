import { randomUUID } from "node:crypto";

import type { UserMappingRepository } from "../../repositories/user-mapping.js";
import type { CreateMoniflowUserInput } from "../../schemas/onboarding.js";
import { BmoniProviderError, BmoniResponseValidationError, BmoniTransportError } from "./errors.js";

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
    private readonly mappings: UserMappingRepository
  ) {}

  async getMapping(localUserId: string): Promise<BmoniUserMappingStatus> {
    const mapping = await this.mappings.findByLocalUserId(localUserId);
    if (!mapping) return null;
    return { bmoniUserId: mapping.bmoniUserId, email: mapping.email, localUserId: mapping.localUserId };
  }

  async createOrFindMapping(input: CreateMoniflowUserInput): Promise<ProvisionBmoniUserResult> {
    if (input.localUserId) {
      const localMapping = await this.mappings.findByLocalUserId(input.localUserId);
      if (localMapping) {
        if (localMapping.email.toLowerCase() !== input.email.toLowerCase()) {
          throw new UserMappingConflictError("The local user is already associated with a different BMONI identity.");
        }
        return { bmoniUserId: localMapping.bmoniUserId, localUserId: localMapping.localUserId, status: "existing" };
      }
    }

    const emailMapping = await this.mappings.findByEmail(input.email);
    if (emailMapping) {
      if (input.localUserId && emailMapping.localUserId !== input.localUserId) {
        throw new UserMappingConflictError("The email is already associated with another local user.");
      }
      return { bmoniUserId: emailMapping.bmoniUserId, localUserId: emailMapping.localUserId, status: "existing" };
    }

    // A previous 409 or uncertain create outcome must never issue another
    // mutation, even if this service was restarted or the user retries.
    const hold=await this.mappings.findHoldByEmail(input.email);
    if (hold) {
      if (hold.localUserId && input.localUserId && hold.localUserId!==input.localUserId) {
        throw new UserMappingConflictError("A held identity belongs to another local user.");
      }
      throw new UserMappingReconciliationHoldError(hold.state);
    }

    const localUserId = input.localUserId ?? randomUUID();
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
      const state = error instanceof BmoniProviderError && error.statusCode===409
        ? "PROVIDER_USER_EXISTS" as const
        : error instanceof BmoniTransportError || error instanceof BmoniResponseValidationError
          ? "PROVIDER_OUTCOME_UNKNOWN" as const
          : null;
      if (state) {
        // Provider state is uncertain; persist a permanent manual hold.
        // Never assume an ID from an error payload is an authorized mapping.
        await this.mappings.createHold({
          email:input.email.trim().toLowerCase(),
          localUserId:input.localUserId??null,
          state,createdAt:new Date().toISOString()
        });
      }
      throw error;
    }
    if (user.email.toLowerCase() !== input.email.toLowerCase()) {
      throw new UserMappingConflictError("The provider response did not preserve the requested identity.");
    }

    const timestamp = new Date().toISOString();
    const mapping = await this.mappings.save({
      bmoniUserId: user.bmoniUserId,
      createdAt: timestamp,
      email: user.email,
      localUserId,
      updatedAt: timestamp
    });
    return { bmoniUserId: mapping.bmoniUserId, localUserId: mapping.localUserId, status: "created" };
  }
}
