import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { moniflowIntentSchema } from "../schemas/intent.js";
import { moneyPlanSchema } from "../schemas/money-plan.js";
import type { BmoniGateway } from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";
import { parseIntent } from "../services/intent/parser.js";
import { buildMoneyPlan, UnsupportedPlanIntentError } from "../services/plans/engine.js";

const parseIntentBodySchema = z.object({
  input: z.string().max(500)
}).strict();

const planBodySchema = z.object({
  input: z.string().max(500),
  localUserId: z.uuid()
}).strict();

type OperatorRouteOptions = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
};

type JsonRecord = Record<string, unknown>;

export const operatorRoutes: FastifyPluginAsync<OperatorRouteOptions> = async (app, options) => {
  app.post<{ Body: unknown }>("/intent", async (request, reply) => {
    const parsed = parseIntentBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "input must be a string up to 500 characters."
      });
    }

    const intent = moniflowIntentSchema.parse(parseIntent(parsed.data.input));
    return reply.send({ intent });
  });

  app.post<{ Body: unknown }>("/plan", async (request, reply) => {
    const parsed = planBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "input and a valid localUserId are required."
      });
    }

    const intent = moniflowIntentSchema.parse(parseIntent(parsed.data.input));
    if (intent.intent === "UNSUPPORTED") {
      return reply.status(422).send({
        statusCode: 422,
        error: "Unprocessable Entity",
        message: "This instruction is not supported deterministically.",
        intent
      });
    }

    const mapping = options.getBmoniUserService().getMapping(parsed.data.localUserId);
    if (!mapping) {
      return reply.status(409).send({
        statusCode: 409,
        error: "Conflict",
        message: "Create the BMONI user before preparing a money plan."
      });
    }

    try {
      const balances = await options.getBmoniGateway().listAccountBalances(mapping.bmoniUserId);
      const currentAvailable = findCngnBalance(balances);
      if (currentAvailable === null) {
        return reply.status(502).send({
          statusCode: 502,
          error: "Bad Gateway",
          message: "BMONI returned an undocumented CNGN balance response."
        });
      }

      const plan = moneyPlanSchema.parse(buildMoneyPlan(intent, currentAvailable));
      return reply.send({ intent, plan });
    } catch (error) {
      if (error instanceof UnsupportedPlanIntentError) {
        return reply.status(422).send({
          statusCode: 422,
          error: "Unprocessable Entity",
          message: error.message
        });
      }
      throw error;
    }
  });
};

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
  if (value === null || typeof value !== "object") return null;
  const record = value as JsonRecord;
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
