import { randomUUID } from "node:crypto";

import type { FastifyPluginAsync } from "fastify";

import { getAuthenticatedUserId } from "../security/user-authorization.js";
import { classifyWorkspaceStorageFailure } from "../security/workspace-storage-diagnostics.js";
import type { BmoniUserService } from "../services/bmoni/user-service.js";

/**
 * Owner-scoped local reconciliation evidence ONLY, never a provider identity proof.
 * No email, phone, fingerprint, provider ID, wallet address or balances leave this route.
 */
type IdentityReconciliationOptions = {
  getBmoniUserService: () => Pick<BmoniUserService, "getMapping" | "getReconciliationHold">;
  getRepositoryReady?: () => Promise<void>;
};

export type IdentityReconciliationReadiness = {
  authenticated: true;
  userId: string;
  mapping: "not_linked" | "recorded_unverified";
  reconciliation: "identity_evidence_required" | "unverified_mapping" | "manual_review_required";
  identityEvidence: "not_collected";
  providerOwnershipVerified: false;
  automaticLinkingEnabled: false;
  financialOperationsEnabled: false;
};

export const identityReconciliationRoutes: FastifyPluginAsync<IdentityReconciliationOptions> =
  async (app, options) => {
    app.get("/reconciliation", async (request, reply) => {
      const userId = getAuthenticatedUserId(request);
      if (!userId) return reply.code(401).send({ code: "AUTH_REQUIRED" });
      reply.header("Cache-Control", "private, no-store");
      let stage: "schema_ready" | "mapping_read" | "hold_read" = "schema_ready";
      try {
        await options.getRepositoryReady?.();
        stage = "mapping_read";
        const mapping = await options.getBmoniUserService().getMapping(userId);
        if (mapping && mapping.localUserId.toLowerCase() !== userId.toLowerCase()) {
          return reply.code(403).send({ code: "WORKSPACE_ACCESS_DENIED" });
        }
        stage = "hold_read";
        const hold = await options.getBmoniUserService().getReconciliationHold(userId);
        if (hold && (!hold.localUserId || hold.localUserId.toLowerCase() !== userId.toLowerCase())) {
          return reply.code(403).send({ code: "WORKSPACE_ACCESS_DENIED" });
        }
        const readiness: IdentityReconciliationReadiness = {
          authenticated: true,
          userId,
          mapping: mapping ? "recorded_unverified" : "not_linked",
          reconciliation: hold
            ? "manual_review_required"
            : mapping ? "unverified_mapping" : "identity_evidence_required",
          identityEvidence: "not_collected",
          providerOwnershipVerified: false,
          automaticLinkingEnabled: false,
          financialOperationsEnabled: false
        };
        return reply.send(readiness);
      } catch (error) {
        // Strictly allowlisted diagnostic metadata; never serialize thrown SQL errors.
        const reference = randomUUID();
        request.log.warn({
          event: "identity_reconciliation_read_failed",
          reference,
          stage,
          kind: classifyWorkspaceStorageFailure(error)
        }, "Local reconciliation lookup unavailable");
        return reply.code(503).send({ code: "RECONCILIATION_READ_UNAVAILABLE", reference });
      }
    });
  };
