import type { FastifyPluginAsync } from "fastify";

import { getAuthenticatedUserId } from "../security/user-authorization.js";

/**
 * JWT authentication proof only. This deliberately does not query BMONI,
 * create users, open wallets, fetch balances or infer KYC readiness.
 *
 * Production's global preValidation verifier must run before this handler.
 */
export const authenticatedSessionRoutes: FastifyPluginAsync = async app => {
  app.get("/session", async (request, reply) => {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      // In non-production, the global JWT preValidation hook is not installed.
      // Never return proof from a caller-supplied user ID or dev-only bypass.
      return reply.status(401).send({ code: "AUTH_REQUIRED" });
    }
    return reply.header("Cache-Control", "no-store, private").send({
      authenticated: true,
      userId,
      providerMappingState: "not_checked",
      walletState: "not_checked",
      kycState: "not_checked",
      financialOperationsEnabled: false
    });
  });
};
