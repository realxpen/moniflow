import { randomUUID } from "node:crypto";

import type { FastifyPluginAsync } from "fastify";

import type { ExecutionRepository } from "../repositories/execution.js";
import type { MoneyPlanRepository } from "../repositories/money-plan.js";
import { getAuthenticatedUserId } from "../security/user-authorization.js";
import { classifyWorkspaceStorageFailure } from "../security/workspace-storage-diagnostics.js";
import { classifyLocalFinancialRecovery, type FinancialRecoveryCase } from "../services/plans/financial-recovery.js";

type FinancialRecoveryOptions = {
  getExecutionRepository: () => Pick<ExecutionRepository, "listPreparationHolds" | "findByPlanId">;
  getMoneyPlanRepository: () => Pick<MoneyPlanRepository, "findById">;
  getRepositoryReady?: () => Promise<void>;
};

/** Authenticated, local-record-only read. No provider API and no unlock. */
export const financialRecoveryRoutes: FastifyPluginAsync<FinancialRecoveryOptions> = async (app, options) => {
  app.get("/financial-recovery", async (request, reply) => {
    const userId = getAuthenticatedUserId(request);
    if (!userId) return reply.code(401).send({ code: "AUTH_REQUIRED" });
    // The verified JWT subject is the sole owner selector. No arbitrary
    // localUserId, email or account selector is supported via URL parameters.
    if (request.query && Object.keys(request.query as object).length > 0) {
      return reply.code(400).send({ code: "OWNER_SELECTOR_NOT_ALLOWED" });
    }
    reply.header("Cache-Control", "private, no-store");
    let phase: "schema_ready" | "holds_read" | "case_review" = "schema_ready";
    try {
      await options.getRepositoryReady?.();
      phase = "holds_read";
      const holds = await options.getExecutionRepository().listPreparationHolds(userId, 26);
      if (holds.length > 26 || holds.some(hold => hold.localUserId.toLowerCase() !== userId.toLowerCase())) {
        return reply.code(403).send({ code: "WORKSPACE_ACCESS_DENIED" });
      }

      phase = "case_review";
      const cases: FinancialRecoveryCase[] = [];
      for (const hold of holds.slice(0, 25)) {
        const [plan, execution] = await Promise.all([
          options.getMoneyPlanRepository().findById(hold.planId, userId),
          options.getExecutionRepository().findByPlanId(hold.planId, userId)
        ]);
        cases.push(classifyLocalFinancialRecovery(hold, plan, execution));
      }

      return reply.send({
        authenticated: true,
        userId,
        evidenceSource: "LOCAL_RECORDS_ONLY",
        providerEvidenceChecked: false,
        financialOperationsEnabled: false,
        automaticReleaseAllowed: false,
        automaticRetryAllowed: false,
        visibleCaseCount: cases.length,
        hasMore: holds.length > 25,
        cases
      });
    } catch (error) {
      const reference = randomUUID();
      request.log.warn({
        event: "local_financial_recovery_read_failed",
        stage: phase,
        reference,
        kind: classifyWorkspaceStorageFailure(error)
      }, "Local-only financial recovery unavailable");
      return reply.code(503).send({ code: "FINANCIAL_RECOVERY_READ_UNAVAILABLE", reference });
    }
  });
};
