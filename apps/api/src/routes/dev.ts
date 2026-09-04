import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { env } from "../config/env.js";
import { SqliteWalletOwnershipRepository } from "../repositories/sqlite-wallet-ownership.js";
import {
  BmoniConfigurationError,
  BmoniProviderError,
  BmoniResponseValidationError,
  BmoniTransportError,
  type BmoniGateway
} from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";

const querySchema = z.object({ localUserId: z.uuid().optional() }).strict();
const requiredLifecycleQuerySchema = z.object({ localUserId: z.uuid() }).strict();
const environment = "sandbox" as const;

type DevRouteOptions = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
};

type JsonRecord = Record<string, unknown>;

export const devRoutes: FastifyPluginAsync<DevRouteOptions> = async (app, options) => {
  const ownership = new SqliteWalletOwnershipRepository(env.DATABASE_URL);
  app.addHook("onClose", async () => ownership.close());

  app.get<{ Querystring: unknown }>("/bmoni-status", async (request, reply) => {
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "localUserId must be a valid UUID when supplied."
      });
    }

    try {
      const currencies = await options.getBmoniGateway().getSupportedSmartWalletCurrencies();
      const mapping = query.data.localUserId
        ? options.getBmoniUserService().getMapping(query.data.localUserId)
        : null;

      return reply.send({
        bmoniApi: "connected",
        environment,
        supportedCurrencies: currencies.currencies,
        user: mapping
          ? {
              status: "created",
              bmoniUserId: mapping.bmoniUserId,
              localUserId: mapping.localUserId
            }
          : { status: "not_created", bmoniUserId: null }
      });
    } catch (error) {
      if (isBmoniError(error)) {
        app.log.warn({ errorName: error.name }, "BMONI debug status check failed");
        return reply.status(503).send({
          bmoniApi: "disconnected",
          environment,
          user: { status: "unknown", bmoniUserId: null }
        });
      }

      throw error;
    }
  });

  app.get<{ Querystring: unknown }>("/bmoni-lifecycle", async (request, reply) => {
    const query = requiredLifecycleQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "localUserId must be a valid UUID."
      });
    }

    const localUserId = query.data.localUserId;
    const mapping = options.getBmoniUserService().getMapping(localUserId);
    const wallet = ownership.findByLocalUserId(localUserId);

    const stages = {
      api: { passed: false, detail: "Not checked" },
      user: { passed: Boolean(mapping), detail: mapping ? "BMONI user mapping persisted" : "No BMONI user mapping" },
      wallet: { passed: Boolean(wallet), detail: wallet ? "Managed CNGN wallet persisted" : "No managed CNGN wallet" },
      nigeriaRail: { passed: false, detail: "Not checked" },
      depositAccount: { passed: false, detail: "Not checked" },
      fundedBalance: { passed: false, detail: "Not checked", amount: null as string | null }
    };

    try {
      await options.getBmoniGateway().getSupportedSmartWalletCurrencies();
      stages.api = { passed: true, detail: "BMONI sandbox reachable" };

      if (!mapping || !wallet) {
        return reply.send({ environment, localUserId, readyForPhase11: false, stages });
      }

      const gateway = options.getBmoniGateway();
      const onboarding = await gateway.getOnboardingStatus(mapping.bmoniUserId);
      const onboardingText = JSON.stringify(onboarding).toLowerCase();
      const railReady = /\b(active|completed|ready)\b/.test(onboardingText) && /\b(ngn|cngn|nigeria)\b/.test(onboardingText);
      stages.nigeriaRail = {
        passed: railReady,
        detail: railReady ? "BMONI reports Nigeria/NGN active" : "Nigeria/NGN not confirmed active"
      };

      try {
        const deposit = await gateway.getNgnDepositAccount(mapping.bmoniUserId);
        const depositRecord = findRecord(deposit, (record) => Boolean(stringValue(record, ["accountNumber", "account_number"])));
        stages.depositAccount = {
          passed: Boolean(depositRecord),
          detail: depositRecord ? "NGN deposit account returned by BMONI" : "No NGN deposit account found"
        };
      } catch (error) {
        if (error instanceof BmoniProviderError && error.statusCode === 404) {
          stages.depositAccount = { passed: false, detail: "NGN deposit account not available yet" };
        } else {
          throw error;
        }
      }

      const balances = await gateway.listAccountBalances(mapping.bmoniUserId);
      const cngn = findCngnBalance(balances);
      stages.fundedBalance = {
        passed: cngn !== null && Number(cngn) > 0,
        detail: cngn === null ? "No CNGN balance found" : Number(cngn) > 0 ? "Provider-backed CNGN balance available" : "CNGN balance is zero",
        amount: cngn
      };

      const readyForPhase11 =
        stages.api.passed &&
        stages.user.passed &&
        stages.wallet.passed &&
        stages.nigeriaRail.passed &&
        stages.fundedBalance.passed;

      return reply.send({ environment, localUserId, readyForPhase11, stages });
    } catch (error) {
      if (isBmoniError(error)) {
        app.log.warn({ errorName: error.name }, "BMONI lifecycle verification failed");
        return reply.status(503).send({
          environment,
          localUserId,
          readyForPhase11: false,
          stages,
          error: "BMONI lifecycle verification could not complete."
        });
      }
      throw error;
    }
  });
};

function isBmoniError(error: unknown): error is BmoniConfigurationError | BmoniProviderError | BmoniResponseValidationError | BmoniTransportError {
  return (
    error instanceof BmoniConfigurationError ||
    error instanceof BmoniTransportError ||
    error instanceof BmoniProviderError ||
    error instanceof BmoniResponseValidationError
  );
}

function findCngnBalance(payload: unknown): string | null {
  const record = findRecord(payload, (candidate) => {
    const code = stringValue(candidate, ["currency", "symbol", "asset", "token", "code"]);
    return code?.toUpperCase() === "CNGN";
  });
  if (!record) return null;
  return stringValue(record, ["availableBalance", "available", "balance", "amount", "total"]) ?? null;
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
