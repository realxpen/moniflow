import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { BankAccountRepository } from "../repositories/bank-account.js";
import type { ExecutionRepository, ProviderExecution } from "../repositories/execution.js";
import type { MoneyPlanRepository } from "../repositories/money-plan.js";
import type { WalletOwnershipRepository } from "../repositories/wallet-ownership.js";
import { BmoniProviderError, type BmoniGateway } from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";
import { fingerprintMoneyPlan, requireApprovedPlanForExecution } from "../services/plans/approval.js";

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
};

type JsonRecord = Record<string, unknown>;

export const executionRoutes: FastifyPluginAsync<ExecutionRouteOptions> = async (app, options) => {
  app.post<{ Params: unknown; Body: unknown }>("/plans/:planId/execution/prepare", async (request, reply) => {
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
    if (!mapping) return reply.status(409).send({ message: "BMONI user mapping is missing." });
    const wallet = await options.getWalletOwnershipRepository().findByLocalUserId(body.data.localUserId);
    if (!wallet) return reply.status(409).send({ message: "Managed CNGN wallet is missing." });
    const bank = await options.getBankAccountRepository().findVerifiedByLabel(body.data.localUserId, withdrawal.label);
    if (!bank) return reply.status(409).send({ message: "Verified BMONI Nigerian withdrawal destination is missing." });

    const balances = await options.getBmoniGateway().listAccountBalances(mapping.bmoniUserId);
    const freshBalance = findCngnBalance(balances);
    if (freshBalance === null) {
      return reply.status(502).send({ message: "BMONI returned an undocumented CNGN balance response." });
    }
    if (freshBalance !== approved.plan.currentAvailable) {
      await options.getMoneyPlanRepository().invalidateApproval(
        params.data.planId,
        body.data.localUserId,
        fingerprintMoneyPlan(approved.plan)
      );
      return reply.status(409).send({
        code: "BALANCE_CHANGED_REPLAN_REQUIRED",
        message: "Provider balance changed after approval. Approval was invalidated; rebuild and approve the Money Plan again."
      });
    }

    const proposalPayload = await options.getBmoniGateway().offrampNigeria(
      mapping.bmoniUserId,
      wallet.bmoniSmartWalletId,
      { bankAccountId: bank.providerAccountId, fromAmount: withdrawal.amount.toFixed(2) }
    );
    const proposalId = extractProposalId(proposalPayload);
    if (!proposalId) return reply.status(502).send({ message: "BMONI offramp returned no proposal id." });

    const now = new Date().toISOString();
    const created = await executions.create({
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
    return refreshPreparedProposal(created, options, reply);
  });

  app.post<{ Params: unknown; Body: unknown }>("/plans/:planId/execution/sign", async (request, reply) => {
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
      return reply.status(409).send({ message: "Prepared BMONI proposal does not match this plan." });
    }
    if (execution.state !== "AWAITING_DEVICE_SIGNATURE" || !execution.signHash) {
      return reply.status(409).send({ message: "This proposal is not awaiting a device signature." });
    }
    if (fingerprintMoneyPlan(approved.plan) !== approved.approvedPlanHash) {
      return reply.status(409).send({ message: "Approved plan integrity changed; signature submission blocked." });
    }

    const mapping = await options.getBmoniUserService().getMapping(body.data.localUserId);
    if (!mapping) return reply.status(409).send({ message: "BMONI user mapping is missing." });

    await options.getBmoniGateway().signProposal(
      mapping.bmoniUserId,
      execution.providerProposalId,
      body.data.signature
    );

    // Once BMONI accepts the signature, do not make the response depend on a
    // second provider read. A follow-up GET drives the authoritative result.
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
    if (!execution) return reply.status(404).send({ message: "No BMONI execution exists for this plan." });
    if (execution.state === "PREPARING") return refreshPreparedProposal(execution, options, reply);
    if (execution.state === "AWAITING_DEVICE_SIGNATURE" || execution.state === "COMPLETED" || execution.state === "FAILED") {
      return reply.send({ execution: publicExecution(execution) });
    }

    const mapping = await options.getBmoniUserService().getMapping(query.data.localUserId);
    if (!mapping) return reply.status(409).send({ message: "BMONI user mapping is missing." });

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

async function refreshPreparedProposal(
  execution: ProviderExecution,
  options: ExecutionRouteOptions,
  reply: any
) {
  const mapping = await options.getBmoniUserService().getMapping(execution.localUserId);
  if (!mapping) return reply.status(409).send({ message: "BMONI user mapping is missing." });

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
    return reply.status(502).send({ message: "BMONI sign-payload returned no documented 32-byte signing digest." });
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
  let record = asRecord(payload);
  if (!record) return null;
  for (let depth = 0; depth < 3; depth += 1) {
    const nested = asRecord(record.data) ?? asRecord(record.value);
    if (!nested) break;
    record = nested;
  }
  return asRecord(record.proposal) ?? record;
}

function isProviderReadinessPending(error: unknown) {
  return error instanceof BmoniProviderError && (error.statusCode === 404 || error.statusCode === 409);
}

function findCngnBalance(payload: unknown): number | null {
  const record = findRecord(payload, (candidate) => {
    const code = stringValue(candidate, ["currency", "symbol", "asset", "token", "code"]);
    return code?.toUpperCase() === "CNGN";
  });
  if (!record) return null;
  const raw = stringValue(record, ["availableBalance", "available", "balance", "amount", "total"]);
  if (raw === undefined) return null;
  const amount = Number(raw.replace(/,/g, ""));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function findRecord(value: unknown, predicate: (record: JsonRecord) => boolean): JsonRecord | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecord(item, predicate);
      if (found) return found;
    }
    return null;
  }
  const record = asRecord(value);
  if (!record) return null;
  if (predicate(record)) return record;
  for (const child of Object.values(record)) {
    const found = findRecord(child, predicate);
    if (found) return found;
  }
  return null;
}

function stringValue(record: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}
