import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { BankAccountRepository } from "../repositories/bank-account.js";
import type { ExecutionRepository, ProviderExecution } from "../repositories/execution.js";
import type { MoneyPlanRepository } from "../repositories/money-plan.js";
import type { PocketRepository } from "../repositories/pocket.js";
import type { WalletOwnershipRepository } from "../repositories/wallet-ownership.js";
import { BmoniProviderError, type BmoniGateway } from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";
import { realFinancialExecutionReleased, REAL_EXECUTION_RELEASE_CODE } from "../services/plans/execution-release-gate.js";
import { fingerprintMoneyPlan, requireApprovedPlanForExecution } from "../services/plans/approval.js";
import { computeAvailableToSpend } from "../services/plans/spendable.js";
import { readCngnAvailableBalance } from "../services/plans/provider-balance.js";
import { getReviewedDestination } from "../services/plans/beneficiary-binding.js";

const paramsSchema = z.object({ planId: z.uuid() }).strict();
const userBodySchema = z.object({ localUserId: z.uuid() }).strict();
const userQuerySchema = z.object({ localUserId: z.uuid() }).strict();
const signBodySchema = z.object({
  localUserId: z.uuid(),
  proposalId: z.string().trim().min(1),
  signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/)
}).strict();

type ExecutionRouteOptions = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
  getMoneyPlanRepository: () => MoneyPlanRepository;
  getWalletOwnershipRepository: () => WalletOwnershipRepository;
  getBankAccountRepository: () => BankAccountRepository;
  getExecutionRepository: () => ExecutionRepository;
  getPocketRepository: () => PocketRepository;
};
type JsonRecord = Record<string, unknown>;

export const executionRoutes: FastifyPluginAsync<ExecutionRouteOptions> = async (app, options) => {
  app.post<{ Params: unknown; Body: unknown }>("/plans/:planId/execution/prepare", async (request, reply) => {
    if (!realFinancialExecutionReleased()) {
      return reply.status(503).send({ code: REAL_EXECUTION_RELEASE_CODE, message: "Real BMONI money execution is not released." });
    }
    const params = paramsSchema.safeParse(request.params);
    const body = userBodySchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.status(400).send({ message: "Valid planId and localUserId are required." });
    }

    const executions = options.getExecutionRepository();
    const existing = await executions.findByPlanId(params.data.planId, body.data.localUserId);
    if (existing) {
      if (existing.state === "FAILED") {
        return reply.status(409).send({ message: "This execution is in FAILED state and will not create a duplicate proposal automatically." });
      }
      if (existing.state === "PREPARING") return refreshPreparedProposal(existing, options, reply);
      return reply.send(publicExecution(existing));
    }

    const approved = await requireApprovedPlanForExecution(
      options.getMoneyPlanRepository(),
      params.data.planId,
      body.data.localUserId
    );
    const withdrawals = approved.plan.actions.filter((action) => action.kind === "BANK_WITHDRAWAL");
    const withdrawal = withdrawals.length === 1 ? withdrawals[0] : undefined;
    if (!withdrawal) {
      return reply.status(409).send({ message: "Execution currently requires exactly one approved bank-withdrawal action." });
    }

    const mapping = await options.getBmoniUserService().getMapping(body.data.localUserId);
    if (!mapping) return reply.status(409).send({ message: "Financial-provider user mapping is missing." });
    const wallet = await options.getWalletOwnershipRepository().findByLocalUserId(body.data.localUserId);
    if (!wallet) return reply.status(409).send({ message: "Managed CNGN wallet is missing." });
    const bank = await getReviewedDestination(withdrawal, body.data.localUserId, options.getBankAccountRepository());
    if (!bank) return reply.status(409).send({ message: "Verified Nigerian withdrawal destination is missing." });

    const balances = await options.getBmoniGateway().listAccountBalances(mapping.bmoniUserId);
    const providerBalance = readCngnAvailableBalance(balances);
    if (providerBalance === null) {
      return reply.status(502).send({ message: "The financial provider returned an undocumented CNGN balance response." });
    }
    const internalAllocated = await options.getPocketRepository().totalAllocated(body.data.localUserId);
    const freshSpendable = computeAvailableToSpend(providerBalance, internalAllocated);
    if (freshSpendable !== approved.plan.currentAvailable) {
      await options.getMoneyPlanRepository().invalidateApproval(
        params.data.planId,
        body.data.localUserId,
        fingerprintMoneyPlan(approved.plan)
      );
      return reply.status(409).send({
        code: "BALANCE_CHANGED_REPLAN_REQUIRED",
        message: "Spendable balance changed after approval. Approval was invalidated; rebuild and approve the Money Plan again."
      });
    }

    // Database uniqueness spans API workers, restarts and concurrent requests.
    // This hold is intentionally NEVER released automatically: a crash between
    // provider submission and our response leaves an UNKNOWN outcome.
    const claimed = await executions.claimSpendablePreparation({
      planId: params.data.planId,
      localUserId: body.data.localUserId,
      approvedPlanHash: fingerprintMoneyPlan(approved.plan),
      providerBankAccountId: bank.providerAccountId,
      amount: withdrawal.amount,
      // All financial commitments use the same owner's headroom, not only
      // the external transfer amount. No in-memory counters or process locks.
      reservedAmount: approved.plan.totals.totalCommitted,
      spendableCeiling: freshSpendable
    });
    if (claimed !== "CLAIMED") {
      const capacityConflict = claimed === "INSUFFICIENT_CAPACITY";
      const legacyConflict = claimed === "UNRECONCILED_LEGACY";
      return reply.status(409).send({
        code: capacityConflict ? "SPENDABLE_CAPACITY_RESERVED" :
          legacyConflict ? "UNRECONCILED_LEGACY_PREPARATION" : "PROVIDER_PREPARATION_ALREADY_CLAIMED",
        message: capacityConflict
          ? "Other Money Plans already reserve this spendable balance. No new provider proposal was submitted."
          : legacyConflict
            ? "Older financial attempts require manual reconciliation before new money can be committed."
            : "This Money Plan already has a durable preparation hold. Never retry an unknown provider outcome automatically."
      });
    }

    let proposalPayload: unknown;
    try {
      proposalPayload = await options.getBmoniGateway().offrampNigeria(
        mapping.bmoniUserId,
        wallet.bmoniSmartWalletId,
        { bankAccountId: bank.providerAccountId, fromAmount: withdrawal.amount.toFixed(2) }
      );
    } catch (error) {
      await executions.recordPreparationOutcome(
        params.data.planId, body.data.localUserId, "PROVIDER_OUTCOME_UNKNOWN"
      );
      throw error;
    }
    const proposalId = extractProposalId(proposalPayload);
    if (!proposalId) {
      await executions.recordPreparationOutcome(
        params.data.planId, body.data.localUserId, "PROVIDER_OUTCOME_UNKNOWN"
      );
      return reply.status(502).send({
        code: "PROVIDER_OUTCOME_UNKNOWN",
        message: "Provider preparation outcome could not be verified. Do not automatically retry."
      });
    }

    const now = new Date().toISOString();
    let created: ProviderExecution;
    try {
      created = await executions.create({
        planId: params.data.planId,
        localUserId: body.data.localUserId,
        providerProposalId: proposalId,
        providerBankAccountId: bank.providerAccountId,
        amount: withdrawal.amount,
        currency: "NGN",
        signHash: null,
        providerStatus: extractProposalStatus(proposalPayload),
        state: "PREPARING",
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      await executions.recordPreparationOutcome(
        params.data.planId, body.data.localUserId, "PROVIDER_OUTCOME_UNKNOWN", proposalId
      );
      throw error;
    }
    await executions.recordPreparationOutcome(
      params.data.planId, body.data.localUserId, "PROPOSAL_RECORDED", proposalId
    );
    return refreshPreparedProposal(created, options, reply);
  });

  // Read-only visibility even when financial operations remain release-gated.
  // No provider call, retry, rollback, or automatic release of the hold.
  app.get<{ Params: unknown; Querystring: unknown }>("/plans/:planId/execution/preparation", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = userQuerySchema.safeParse(request.query);
    if (!params.success || !query.success) {
      return reply.status(400).send({ message: "Valid planId and localUserId are required." });
    }
    const hold = await options.getExecutionRepository().findPreparationHold(
      params.data.planId, query.data.localUserId
    );
    if (!hold) return reply.status(404).send({ message: "No preparation attempt exists for this plan." });
    return reply.send({
      planId: hold.planId,
      state: hold.state,
      providerProposalRecorded: hold.state === "PROPOSAL_RECORDED",
      requiresManualReconciliation: hold.state !== "PROPOSAL_RECORDED",
      createdAt: hold.createdAt,
      updatedAt: hold.updatedAt,
      automaticRetryAllowed: false
    });
  });

  app.post<{ Params: unknown; Body: unknown }>("/plans/:planId/execution/sign", async (request, reply) => {
    if (!realFinancialExecutionReleased()) {
      return reply.status(503).send({ code: REAL_EXECUTION_RELEASE_CODE, message: "Real BMONI money execution is not released." });
    }
    const params = paramsSchema.safeParse(request.params);
    const body = signBodySchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.status(400).send({ message: "Valid planId, localUserId, proposalId, and raw transaction-hash signature are required." });
    }

    const approved = await requireApprovedPlanForExecution(
      options.getMoneyPlanRepository(),
      params.data.planId,
      body.data.localUserId
    );
    const execution = await options.getExecutionRepository().findByPlanId(params.data.planId, body.data.localUserId);
    if (!execution || execution.providerProposalId !== body.data.proposalId) {
      return reply.status(409).send({ message: "Prepared provider proposal does not match this plan." });
    }
    if (execution.state !== "AWAITING_DEVICE_SIGNATURE" || !execution.signHash) {
      return reply.status(409).send({ message: "This proposal is not awaiting a device signature." });
    }
    if (fingerprintMoneyPlan(approved.plan) !== approved.approvedPlanHash) {
      return reply.status(409).send({ message: "Approved plan integrity changed; signature submission blocked." });
    }
    const signedWithdrawals = approved.plan.actions.filter((action) => action.kind === "BANK_WITHDRAWAL");
    const signedWithdrawal = signedWithdrawals.length === 1 ? signedWithdrawals[0] : undefined;
    const signedBank = signedWithdrawal
      ? await getReviewedDestination(signedWithdrawal, body.data.localUserId, options.getBankAccountRepository())
      : null;
    if (!signedWithdrawal || !signedBank ||
        execution.providerBankAccountId !== signedBank.providerAccountId ||
        execution.amount !== signedWithdrawal.amount || execution.currency !== approved.plan.currency) {
      return reply.status(409).send({ code: "EXECUTION_BENEFICIARY_MISMATCH", message: "Prepared proposal does not match the reviewed beneficiary and amount. Signature submission blocked." });
    }

    const mapping = await options.getBmoniUserService().getMapping(body.data.localUserId);
    if (!mapping) return reply.status(409).send({ message: "Financial-provider user mapping is missing." });

    await options.getBmoniGateway().signProposal(mapping.bmoniUserId, execution.providerProposalId, body.data.signature);
    const updated = await options.getExecutionRepository().update({
      ...execution,
      signHash: null,
      state: "PROCESSING",
      updatedAt: new Date().toISOString()
    });
    return reply.send({ execution: publicExecution(updated) });
  });

  app.get<{ Params: unknown; Querystring: unknown }>("/plans/:planId/execution/status", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = userQuerySchema.safeParse(request.query);
    if (!params.success || !query.success) {
      return reply.status(400).send({ message: "Valid planId and localUserId are required." });
    }

    const execution = await options.getExecutionRepository().findByPlanId(params.data.planId, query.data.localUserId);
    if (!execution) return reply.status(404).send({ message: "No provider execution exists for this plan." });
    if (execution.state === "PREPARING") return refreshPreparedProposal(execution, options, reply);
    if (execution.state === "AWAITING_DEVICE_SIGNATURE" || execution.state === "COMPLETED" || execution.state === "FAILED") {
      return reply.send({ execution: publicExecution(execution) });
    }

    const mapping = await options.getBmoniUserService().getMapping(query.data.localUserId);
    if (!mapping) return reply.status(409).send({ message: "Financial-provider user mapping is missing." });

    const provider = await options.getBmoniGateway().getProposal(mapping.bmoniUserId, execution.providerProposalId);
    const providerStatus = extractProposalStatus(provider);
    const updated = await options.getExecutionRepository().update({
      ...execution,
      providerStatus,
      state: executionStateFromProvider(providerStatus),
      updatedAt: new Date().toISOString()
    });
    return reply.send({ execution: publicExecution(updated), provider });
  });
};

async function refreshPreparedProposal(execution: ProviderExecution, options: ExecutionRouteOptions, reply: any) {
  const mapping = await options.getBmoniUserService().getMapping(execution.localUserId);
  if (!mapping) return reply.status(409).send({ message: "Financial-provider user mapping is missing." });

  const gateway = options.getBmoniGateway();
  let provider: unknown;
  let providerStatus = execution.providerStatus;
  try {
    provider = await gateway.getProposal(mapping.bmoniUserId, execution.providerProposalId);
    providerStatus = extractProposalStatus(provider) ?? providerStatus;
  } catch (error) {
    if (!isProviderReadinessPending(error)) throw error;
  }

  const terminalState = executionStateFromProvider(providerStatus);
  if (terminalState === "COMPLETED" || terminalState === "FAILED") {
    const updated = await options.getExecutionRepository().update({
      ...execution,
      signHash: null,
      providerStatus,
      state: terminalState,
      updatedAt: new Date().toISOString()
    });
    return reply.send({ execution: publicExecution(updated), ...(provider ? { provider } : {}) });
  }

  if (providerStatus?.toUpperCase() !== "PENDING_SIGNATURES") {
    const updated = await options.getExecutionRepository().update({
      ...execution,
      signHash: null,
      providerStatus,
      state: "PREPARING",
      updatedAt: new Date().toISOString()
    });
    return reply.send({ execution: publicExecution(updated), ...(provider ? { provider } : {}) });
  }

  let signPayload: unknown;
  try {
    signPayload = await gateway.getProposalSignPayload(mapping.bmoniUserId, execution.providerProposalId);
  } catch (error) {
    if (!isProviderReadinessPending(error)) throw error;
    const updated = await options.getExecutionRepository().update({
      ...execution,
      signHash: null,
      providerStatus,
      state: "PREPARING",
      updatedAt: new Date().toISOString()
    });
    return reply.send({ execution: publicExecution(updated), ...(provider ? { provider } : {}) });
  }

  const hashToSign = extractSignableHash(signPayload);
  if (!hashToSign) {
    return reply.status(502).send({ message: "Provider sign-payload returned no documented 32-byte signing digest." });
  }

  const updated = await options.getExecutionRepository().update({
    ...execution,
    signHash: hashToSign,
    providerStatus,
    state: "AWAITING_DEVICE_SIGNATURE",
    updatedAt: new Date().toISOString()
  });
  return reply.send({ execution: publicExecution(updated) });
}

function publicExecution(execution: ProviderExecution) {
  return {
    planId: execution.planId,
    proposalId: execution.providerProposalId,
    amount: execution.amount,
    currency: execution.currency,
    hashToSign: execution.state === "AWAITING_DEVICE_SIGNATURE" ? execution.signHash : null,
    providerStatus: execution.providerStatus,
    state: execution.state,
    updatedAt: execution.updatedAt
  };
}

export function executionStateFromProvider(status: string | null): ProviderExecution["state"] {
  const normalized = status?.toUpperCase();
  if (normalized === "COMPLETED") return "COMPLETED";
  if (normalized && ["FAILED", "REJECTED", "CANCELLED", "CANCELED"].includes(normalized)) return "FAILED";
  return "PROCESSING";
}

export function extractProposalId(payload: unknown): string | null {
  const record = proposalRecord(payload);
  return text(record?.proposalId) ?? text(record?.id);
}

export function extractProposalStatus(payload: unknown): string | null {
  return text(proposalRecord(payload)?.status);
}

export function extractSignableHash(payload: unknown): string | null {
  const hashKeys = ["hashToSign", "signingPayloadHash", "payloadHash", "messageToSign", "digest", "hash"] as const;
  const wrapperKeys = ["data", "value", "signatureRequest", "payload"] as const;
  const hashPattern = /^0x[0-9a-fA-F]{64}$/;

  const walk = (value: unknown, depth: number): string | null => {
    if (depth > 5) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return hashPattern.test(trimmed) ? trimmed : null;
    }
    const record = asRecord(value);
    if (!record) return null;
    for (const key of hashKeys) {
      const found = walk(record[key], depth + 1);
      if (found) return found;
    }
    for (const key of wrapperKeys) {
      const found = walk(record[key], depth + 1);
      if (found) return found;
    }
    return null;
  };
  return walk(payload, 0);
}

function proposalRecord(payload: unknown): JsonRecord | null {
  const initial = asRecord(payload);
  if (!initial) return null;
  let record: JsonRecord = initial;
  for (let depth = 0; depth < 3; depth += 1) {
    const nested = asRecord(record["data"]) ?? asRecord(record["value"]);
    if (!nested) break;
    record = nested;
  }
  return asRecord(record["proposal"]) ?? record;
}

function isProviderReadinessPending(error: unknown) {
  return error instanceof BmoniProviderError && (error.statusCode === 404 || error.statusCode === 409);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}
