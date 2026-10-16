import type { FastifyPluginAsync } from "fastify";

import type { WalletOwnershipRepository } from "../repositories/wallet-ownership.js";
import { getAuthenticatedUserId } from "../security/user-authorization.js";
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
    try {
      const mapping = await options.getBmoniUserService().getMapping(userId);
      // A mapping for another subject must never make the current subject ready.
      if (mapping && mapping.localUserId.toLowerCase() !== userId.toLowerCase()) {
        return reply.code(403).send({ code: "WORKSPACE_ACCESS_DENIED" });
      }
      // Do not read the wallet repository until a local provider mapping exists.
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
    } catch {
      // A database error is not evidence that no account exists. Fail shut.
      return reply.code(503).send({ code: "WORKSPACE_READ_UNAVAILABLE" });
    }
  });
};
