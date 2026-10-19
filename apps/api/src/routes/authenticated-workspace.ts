import { randomUUID } from "node:crypto";

import type { FastifyPluginAsync } from "fastify";

import type { WalletOwnershipRepository } from "../repositories/wallet-ownership.js";
import { getAuthenticatedUserId } from "../security/user-authorization.js";
import { classifyWorkspaceStorageFailure } from "../security/workspace-storage-diagnostics.js";
import type { BmoniUserService } from "../services/bmoni/user-service.js";

export type WorkspaceOverview = {
  authenticated: true;
  userId: string;
  mapping: "not_linked" | "recorded";
  wallet: "not_created" | "recorded_not_reverified";
  kyc: "not_checked";
  providerReadAccess: false;
  financialOperationsEnabled: false;
  /** No funds, provider identifiers or personal data are returned by this route. */
  accountData: "withheld_until_verified";
};

type WorkspaceRouteOptions = {
  getBmoniUserService: () => Pick<BmoniUserService, "getMapping">;
  /** Await schema readiness before the first serverless SELECT. */
  getRepositoryReady?: () => Promise<void>;
  getWalletOwnershipRepository: () => Pick<WalletOwnershipRepository, "findByLocalUserId">;
};

/**
 * Authenticated user-subject scoped local-readiness snapshot only.
 * A persisted mapping is not independent confirmation of provider KYC or
 * remote wallet ownership. NEVER contact BMONI from this route.
 */
export const authenticatedWorkspaceRoutes: FastifyPluginAsync<WorkspaceRouteOptions> = async (app, options) => {
  app.get("/overview", async (request, reply) => {
    const userId = getAuthenticatedUserId(request);
    if (!userId) return reply.code(401).send({ code: "AUTH_REQUIRED" });

    reply.header("Cache-Control", "private, no-store");
    let phase: "schema_ready" | "mapping_read" | "wallet_read" = "schema_ready";
    try {
      await options.getRepositoryReady?.();
      phase = "mapping_read";
      const mapping = await options.getBmoniUserService().getMapping(userId);
      // A mapping for another subject must never make the current subject ready.
      if (mapping && mapping.localUserId.toLowerCase() !== userId.toLowerCase()) {
        return reply.code(403).send({ code: "WORKSPACE_ACCESS_DENIED" });
      }
      // Do not read the wallet repository until a local provider mapping exists.
      phase = "wallet_read";
      const wallet = mapping ? await options.getWalletOwnershipRepository().findByLocalUserId(userId) : null;
      if (wallet && wallet.localUserId.toLowerCase() !== userId.toLowerCase()) {
        return reply.code(403).send({ code: "WORKSPACE_ACCESS_DENIED" });
      }
      const overview: WorkspaceOverview = {
        authenticated: true,
        userId,
        mapping: mapping ? "recorded" : "not_linked",
        wallet: wallet ? "recorded_not_reverified" : "not_created",
        kyc: "not_checked",
        providerReadAccess: false,
        financialOperationsEnabled: false,
        accountData: "withheld_until_verified"
      };
      return reply.send(overview);
    } catch (error) {
      // Only an allowlisted category and non-sensitive stage enter private runtime logs.
      // Never log raw postgres Errors (they may contain SQL, connection details or PII).
      // This random reference carries no account or provider identity. It is
      // safe for a tester to share, and correlates the response to private logs.
      const reference = randomUUID();
      request.log.warn({
        event: "workspace_storage_read_failed",
        reference,
        stage: phase,
        kind: classifyWorkspaceStorageFailure(error)
      }, "Account readiness lookup unavailable");
      // A database error is never evidence that the account has no wallet. Fail shut.
      return reply.code(503).send({ code: "WORKSPACE_READ_UNAVAILABLE", reference });
    }
  });
};
