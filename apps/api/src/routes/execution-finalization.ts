import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { ActivityRepository } from "../repositories/activity.js";
import type { ExecutionRepository } from "../repositories/execution.js";
import type { MoneyPlanRepository } from "../repositories/money-plan.js";
import type { PocketRepository } from "../repositories/pocket.js";
import type { BmoniGateway } from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";

const paramsSchema = z.object({ planId: z.uuid() }).strict();
const bodySchema = z.object({ localUserId: z.uuid() }).strict();
type JsonRecord = Record<string, unknown>;

type FinalizationRouteOptions = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
  getMoneyPlanRepository: () => MoneyPlanRepository;
  getExecutionRepository: () => ExecutionRepository;
  getPocketRepository: () => PocketRepository;
  getActivityRepository: () => ActivityRepository;
};

export const executionFinalizationRoutes: FastifyPluginAsync<FinalizationRouteOptions> = async (app, options) => {
  app.post<{ Params: unknown; Body: unknown }>("/plans/:planId/execution/finalize", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const body = bodySchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ message: "Valid planId and localUserId are required." });

    const executionRepository = options.getExecutionRepository();
    let execution = await executionRepository.findByPlanId(params.data.planId, body.data.localUserId);
    if (!execution) return reply.status(404).send({ message: "Execution not found for this Money Plan." });

    if (execution.state !== "COMPLETED") {
      const mapping = await options.getBmoniUserService().getMapping(body.data.localUserId);
      if (!mapping) return reply.status(409).send({ message: "Provider user mapping is missing." });
      const provider = await options.getBmoniGateway().getProposal(mapping.bmoniUserId, execution.providerProposalId);
      const providerStatus = extractStatus(provider);
      if (providerStatus !== "COMPLETED") {
        return reply.status(409).send({
          code: "PROVIDER_NOT_COMPLETED",
          message: "Execution cannot be finalized until the provider confirms completion.",
          providerStatus
        });
      }
      execution = await executionRepository.update({
        ...execution,
        signHash: null,
        providerStatus,
        state: "COMPLETED",
        updatedAt: new Date().toISOString()
      });
    }

    const planRepository = options.getMoneyPlanRepository();
    const stored = await planRepository.findById(params.data.planId, body.data.localUserId);
    if (!stored) return reply.status(404).send({ message: "Money Plan not found." });

    const withdrawal = stored.plan.actions.find((action) => action.kind === "BANK_WITHDRAWAL");
    if (withdrawal) {
      await options.getActivityRepository().recordOnce({
        localUserId: body.data.localUserId,
        kind: "BANK_WITHDRAWAL",
        status: "COMPLETED",
        amount: withdrawal.amount,
        currency: "NGN",
        reference: `plan:${params.data.planId}:withdrawal:${withdrawal.index}`,
        source: "provider",
        metadata: { planId: params.data.planId, proposalId: execution.providerProposalId, label: withdrawal.label }
      });
    }

    for (const action of stored.plan.actions) {
      if (action.kind !== "ALLOCATE_POCKET") continue;
      const allocation = await options.getPocketRepository().applyPlanAllocation({
        localUserId: body.data.localUserId,
        planId: params.data.planId,
        actionIndex: action.index,
        name: action.label,
        amount: action.amount
      });
      await options.getActivityRepository().recordOnce({
        localUserId: body.data.localUserId,
        kind: "POCKET_ALLOCATION",
        status: "COMPLETED",
        amount: action.amount,
        currency: "NGN",
        reference: `plan:${params.data.planId}:pocket:${action.index}`,
        source: "internal",
        metadata: { planId: params.data.planId, pocketId: allocation.pocket.id, pocketName: allocation.pocket.name }
      });
    }

    if (planRepository.transitionExecutionStatus) {
      await planRepository.transitionExecutionStatus(
        params.data.planId,
        body.data.localUserId,
        ["APPROVED", "EXECUTING", "AWAITING_DEVICE_SIGNATURE", "PROCESSING", "COMPLETED"],
        "COMPLETED"
      );
    }

    const [pockets, activity] = await Promise.all([
      options.getPocketRepository().list(body.data.localUserId),
      options.getActivityRepository().list(body.data.localUserId, 20)
    ]);
    return reply.send({ execution, pockets, activity });
  });
};

function extractStatus(payload: unknown): string | null {
  const walk = (value: unknown, depth: number): string | null => {
    if (depth > 5 || value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as JsonRecord;
    if (typeof record.status === "string" && record.status.trim()) return record.status.trim().toUpperCase();
    for (const key of ["data", "value", "proposal"]) {
      const found = walk(record[key], depth + 1);
      if (found) return found;
    }
    return null;
  };
  return walk(payload, 0);
}
