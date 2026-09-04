import { randomUUID } from "node:crypto";

import type { UserMappingRepository } from "../../repositories/user-mapping.js";
import type { CreateMoniflowUserInput } from "../../schemas/onboarding.js";

import type { BmoniGateway } from "./gateway.js";

export class UserMappingConflictError extends Error {
  override readonly name = "UserMappingConflictError";
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

  getMapping(localUserId: string): BmoniUserMappingStatus {
    const mapping = this.mappings.findByLocalUserId(localUserId);
    if (!mapping) return null;

    return {
      bmoniUserId: mapping.bmoniUserId,
      email: mapping.email,
      localUserId: mapping.localUserId
    };
  }

  async createOrFindMapping(
    input: CreateMoniflowUserInput
  ): Promise<ProvisionBmoniUserResult> {
    if (input.localUserId) {
      const localMapping = this.mappings.findByLocalUserId(input.localUserId);
      if (localMapping) {
        if (localMapping.email.toLowerCase() !== input.email.toLowerCase()) {
          throw new UserMappingConflictError(
            "The local user is already associated with a different BMONI identity."
          );
        }

        return {
          bmoniUserId: localMapping.bmoniUserId,
          localUserId: localMapping.localUserId,
          status: "existing"
        };
      }
    }

    const emailMapping = this.mappings.findByEmail(input.email);
    if (emailMapping) {
      if (input.localUserId && emailMapping.localUserId !== input.localUserId) {
        throw new UserMappingConflictError(
          "The email is already associated with another local user."
        );
      }

      return {
        bmoniUserId: emailMapping.bmoniUserId,
        localUserId: emailMapping.localUserId,
        status: "existing"
      };
    }

    const localUserId = input.localUserId ?? randomUUID();
    const { localUserId: _ignoredLocalUserId, ...providerInput } = input;
    const user = await this.gateway.createUser(providerInput);

    if (user.email.toLowerCase() !== input.email.toLowerCase()) {
      throw new UserMappingConflictError(
        "The provider response did not preserve the requested identity."
      );
    }

    const timestamp = new Date().toISOString();
    const mapping = this.mappings.save({
      bmoniUserId: user.bmoniUserId,
      createdAt: timestamp,
      email: user.email,
      localUserId,
      updatedAt: timestamp
    });

    return {
      bmoniUserId: mapping.bmoniUserId,
      localUserId: mapping.localUserId,
      status: "created"
    };
  }
}
