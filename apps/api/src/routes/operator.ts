import { evaluateMoniGuard, type GuardCheck, type GuardResult } from "@moniflow/moniguard";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";

import type { BankAccountRepository } from "../repositories/bank-account.js";
import type { MoneyPlanRepository } from "../repositories/money-plan.js";
import { moniflowIntentSchema } from "../schemas/intent.js";
import { moneyPlanSchema } from "../schemas/money-plan.js";
import type { BmoniGateway } from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";
import { parseIntent } from "../services/intent/parser.js";
import {
  ApprovalStateError,
  approveMoneyPlan,
  fingerprintMoneyPlan,
  loadAuthorizationPlan,
  requireApprovedPlanForExecution
} from "../services/plans/approval.js";
import { buildMoneyPlan, UnsupportedPlanIntentError } from "../services/plans/engine.js";

const parseIntentBodySchema = z.object({ input: z.string().max(500) }).strict();
const planBodySchema = z.object({
  intent: moniflowIntentSchema,
  localUserId: z.uuid(),
  originalInstruction: z.string().trim().max(500).optional()
}).strict();
const guardBodySchema = z.object({ intent: moniflowIntentSchema, plan: moneyPlanSchema }).strict();
const secureGuardBodySchema = z.object({ localUserId: z.uuid() }).strict();
const approvalBodySchema = z.object({ localUserId: z.uuid(), expectedPlanHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
const planQuerySchema = z.object({ localUserId: z.uuid() }).strict();
const planParamsSchema = z.object({ planId: z.uuid() }).strict();

type OperatorRouteOptions = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
  getMoneyPlanRepository: () => MoneyPlanRepository;
  getBankAccountRepository: () => BankAccountRepository;
};
type JsonRecord = Record<string, unknown>;

export const operatorRoutes: FastifyPluginAsync<OperatorRouteOptions> = async (app, options) => {
  app.post<{ Body: unknown }>("/intent", async (request, reply) => {
    const parsed = parseIntentBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "input must be a string up to 500 characters." });
    const intent = moniflowIntentSchema.parse(parseIntent(parsed.data.input));
    return reply.send({ intent });
  });

  app.post<{ Body: unknown }>("/plan", async (request, reply) => {
    const parsed = planBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "A validated Phase 8 intent and valid localUserId are required." });
    const intent = parsed.data.intent;
    if (intent.intent === "UNSUPPORTED") return reply.status(422).send({ statusCode: 422, error: "Unprocessable Entity", message: "Unsupported intent cannot become a Money Plan.", intent });

    const mapping = await options.getBmoniUserService().getMapping(parsed.data.localUserId);
    if (!mapping) return reply.status(409).send({ statusCode: 409, error: "Conflict", message: "Create the BMONI user before preparing a money plan." });

    try {
      const balances = await options.getBmoniGateway().listAccountBalances(mapping.bmoniUserId);
      const currentAvailable = findCngnBalance(balances);
      if (currentAvailable === null) return reply.status(502).send({ statusCode: 502, error: "Bad Gateway", message: "BMONI returned an undocumented CNGN balance response." });
      const plan = moneyPlanSchema.parse(buildMoneyPlan(intent, currentAvailable));
      const planHash = fingerprintMoneyPlan(plan);
      const persisted = await options.getMoneyPlanRepository().create({
        localUserId: parsed.data.localUserId,
        originalInstruction: parsed.data.originalInstruction ?? intent.intent,
        intent,
        plan,
        planHash
      });
      return reply.send({ intent, plan, planId: persisted.id, planHash, status: persisted.status });
    } catch (error) {
      if (error instanceof UnsupportedPlanIntentError) return reply.status(422).send({ statusCode: 422, error: "Unprocessable Entity", message: error.message });
      throw error;
    }
  });

  // Legacy Phase 10 preview only. It never changes approval state and cannot authorize execution.
  app.post<{ Body: unknown }>("/guard", async (request, reply) => {
    const parsed = guardBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "A validated intent and Money Plan are required for MONI Guard." });
    return reply.send(evaluateMoniGuard({ intent: parsed.data.intent, plan: parsed.data.plan }));
  });

  app.post<{ Params: unknown; Body: unknown }>("/plans/:planId/guard", async (request, reply) => {
    const params = planParamsSchema.safeParse(request.params);
    const body = secureGuardBodySchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "Valid planId and localUserId are required." });

    const repository = options.getMoneyPlanRepository();
    const stored = await repository.findById(params.data.planId, body.data.localUserId);
    if (!stored) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Money Plan not found." });
    if (["EXECUTING", "AWAITING_DEVICE_SIGNATURE", "PROCESSING", "COMPLETED"].includes(stored.status)) {
      return reply.status(409).send({ statusCode: 409, error: "Conflict", message: `MONI Guard cannot re-evaluate a plan in ${stored.status}.` });
    }

    const currentHash = fingerprintMoneyPlan(stored.plan);
    let result: GuardResult = evaluateMoniGuard({ intent: stored.intent, plan: stored.plan });
    const withdrawal = stored.plan.actions.find((action) => action.kind === "BANK_WITHDRAWAL");
    if (withdrawal) {
      const destination = await options.getBankAccountRepository().findVerifiedByLabel(body.data.localUserId, withdrawal.label);
      result = withVerifiedDestination(result, destination ? `${destination.bankName} ${destination.maskedAccountNumber}` : null);
    }

    const updated = await repository.recordGuard(params.data.planId, body.data.localUserId, result.verdict, result.checks, currentHash);
    if (!updated) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Money Plan not found." });
    return reply.send({ ...result, planId: updated.id, planHash: currentHash, status: updated.status });
  });

  app.get<{ Params: unknown; Querystring: unknown }>("/plans/:planId/authorization", async (request, reply) => {
    const params = planParamsSchema.safeParse(request.params);
    const query = planQuerySchema.safeParse(request.query);
    if (!params.success || !query.success) return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "Valid planId and localUserId are required." });

    try {
      const stored = await loadAuthorizationPlan(options.getMoneyPlanRepository(), params.data.planId, query.data.localUserId);
      if (stored.status !== "AWAITING_USER_APPROVAL" && stored.status !== "APPROVED") {
        return reply.status(409).send({ statusCode: 409, error: "Conflict", message: `Plan is ${stored.status}; human authorization is not available.` });
      }
      const withdrawal = stored.plan.actions.find((action) => action.kind === "BANK_WITHDRAWAL");
      if (!withdrawal) return reply.status(409).send({ statusCode: 409, error: "Conflict", message: "This plan has no external bank withdrawal to authorize." });
      const destination = await options.getBankAccountRepository().findVerifiedByLabel(query.data.localUserId, withdrawal.label);
      if (!destination) return reply.status(409).send({ statusCode: 409, error: "Conflict", message: "The bank destination is no longer verified. Run MONI Guard again." });

      return reply.send({
        authorization: {
          planId: stored.id,
          status: stored.status,
          planHash: fingerprintMoneyPlan(stored.plan),
          amount: withdrawal.amount,
          currency: stored.plan.currency,
          destination: {
            bankName: destination.bankName,
            maskedAccountNumber: destination.maskedAccountNumber,
            accountHolderName: destination.accountHolderName,
            providerAccountId: destination.providerAccountId
          },
          availableAfter: stored.plan.totals.availableAfter,
          warning: "This action will move money outside MONIFlow."
        }
      });
    } catch (error) {
      return handleApprovalError(reply, error);
    }
  });

  app.post<{ Params: unknown; Body: unknown }>("/plans/:planId/approve", async (request, reply) => {
    const params = planParamsSchema.safeParse(request.params);
    const body = approvalBodySchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "Valid planId, localUserId, and expectedPlanHash are required." });

    try {
      const stored = await loadAuthorizationPlan(options.getMoneyPlanRepository(), params.data.planId, body.data.localUserId);
      const withdrawal = stored.plan.actions.find((action) => action.kind === "BANK_WITHDRAWAL");
      if (withdrawal) {
        const destination = await options.getBankAccountRepository().findVerifiedByLabel(body.data.localUserId, withdrawal.label);
        if (!destination) return reply.status(409).send({ statusCode: 409, error: "Conflict", message: "Verified bank destination required before approval." });
      }
      const approved = await approveMoneyPlan(options.getMoneyPlanRepository(), params.data.planId, body.data.localUserId, body.data.expectedPlanHash);
      return reply.send({ approval: { planId: approved.id, status: approved.status, approvedAt: approved.approvedAt, approvedPlanHash: approved.approvedPlanHash } });
    } catch (error) {
      return handleApprovalError(reply, error);
    }
  });

  app.get<{ Params: unknown; Querystring: unknown }>("/plans/:planId/execution-readiness", async (request, reply) => {
    const params = planParamsSchema.safeParse(request.params);
    const query = planQuerySchema.safeParse(request.query);
    if (!params.success || !query.success) return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "Valid planId and localUserId are required." });
    try {
      const approved = await requireApprovedPlanForExecution(options.getMoneyPlanRepository(), params.data.planId, query.data.localUserId);
      const withdrawal = approved.plan.actions.find((action) => action.kind === "BANK_WITHDRAWAL");
      if (withdrawal) {
        const destination = await options.getBankAccountRepository().findVerifiedByLabel(query.data.localUserId, withdrawal.label);
        if (!destination) return reply.status(409).send({ planId: approved.id, canExecute: false, approvalHashMatches: true, error: "DESTINATION_NOT_VERIFIED", message: "Verified bank destination required before execution." });
      }
      return reply.send({ planId: approved.id, status: approved.status, canExecute: true, approvalHashMatches: true });
    } catch (error) {
      if (error instanceof ApprovalStateError) {
        return reply.status(error.code === "NOT_FOUND" ? 404 : 409).send({ planId: params.data.planId, canExecute: false, approvalHashMatches: false, error: error.code, message: error.message });
      }
      throw error;
    }
  });
};

function withVerifiedDestination(result: GuardResult, verifiedDestination: string | null): GuardResult {
  const checks = result.checks.map((check): GuardCheck => {
    if (check.rule !== "DESTINATION") return check;
    return verifiedDestination
      ? { ...check, passed: true, severity: "info", message: `${verifiedDestination} is a verified BMONI withdrawal destination.` }
      : { ...check, passed: false, severity: "critical", message: "A verified BMONI Nigerian bank destination is required." };
  });
  const blocked = checks.some((check) => !check.passed && check.severity === "critical");
  const needsApproval = checks.some((check) => check.rule === "HUMAN_APPROVAL" && check.passed && check.severity === "warning");
  return { checks, verdict: blocked ? "BLOCK" : needsApproval ? "REVIEW" : "ALLOW" };
}

function handleApprovalError(reply: FastifyReply, error: unknown) {
  if (error instanceof ApprovalStateError) {
    const statusCode = error.code === "NOT_FOUND" ? 404 : 409;
    return reply.status(statusCode).send({ statusCode, error: "Approval State Error", code: error.code, message: error.message });
  }
  throw error;
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
    for (const item of value) { const found = findRecord(item, predicate); if (found) return found; }
    return null;
  }
  if (value === null || typeof value !== "object") return null;
  const record = value as JsonRecord;
  if (predicate(record)) return record;
  for (const child of Object.values(record)) { const found = findRecord(child, predicate); if (found) return found; }
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
