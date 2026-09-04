import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from "fastify";
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

const localUserIdSchema = z.uuid();

type WalletRouteOptions = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
};

type JsonRecord = Record<string, unknown>;

export const walletRoutes: FastifyPluginAsync<WalletRouteOptions> = async (app, options) => {
  const ownership = new SqliteWalletOwnershipRepository(env.DATABASE_URL);
  app.addHook("onClose", async () => ownership.close());

  app.get<{ Querystring: { localUserId?: string } }>("/", async (request, reply) => {
    const context = resolveContext(request.query.localUserId, options.getBmoniUserService(), ownership, reply);
    if (!context) return;

    try {
      const payload = await options.getBmoniGateway().getSmartWallet(context.mapping.bmoniUserId, context.wallet.bmoniSmartWalletId);
      const record = findRecord(payload, (candidate) =>
        stringValue(candidate, ["id", "smartWalletId"]) === context.wallet.bmoniSmartWalletId ||
        stringValue(candidate, ["address", "walletAddress"])?.toLowerCase() === context.wallet.smartWalletAddress.toLowerCase()
      ) ?? asRecord(payload);

      if (!record) return reply.status(502).send({ statusCode: 502, error: "Bad Gateway", message: "BMONI returned an undocumented wallet response." });

      return {
        wallet: {
          id: stringValue(record, ["smartWalletId", "id"]) ?? context.wallet.bmoniSmartWalletId,
          address: stringValue(record, ["address", "walletAddress"]) ?? context.wallet.smartWalletAddress,
          currency: stringValue(record, ["currency", "symbol"]) ?? "CNGN",
          status: normalizeWalletStatus(stringValue(record, ["status", "state"]))
        }
      };
    } catch (error) {
      return handleBmoniError(app, reply, error, "wallet lookup");
    }
  });

  app.get<{ Querystring: { localUserId?: string } }>("/balance", async (request, reply) => {
    const context = resolveContext(request.query.localUserId, options.getBmoniUserService(), ownership, reply);
    if (!context) return;

    try {
      const payload = await options.getBmoniGateway().listAccountBalances(context.mapping.bmoniUserId);
      const balance = findBalance(payload, "CNGN");
      if (!balance) return reply.status(502).send({ statusCode: 502, error: "Bad Gateway", message: "BMONI returned an undocumented balance response." });

      return {
        balance: {
          amount: balance.amount,
          currency: "CNGN",
          fiatCurrency: "NGN",
          source: "bmoni"
        }
      };
    } catch (error) {
      return handleBmoniError(app, reply, error, "balance lookup");
    }
  });

  app.get<{ Querystring: { localUserId?: string } }>("/deposit-account", async (request, reply) => {
    const context = resolveContext(request.query.localUserId, options.getBmoniUserService(), ownership, reply);
    if (!context) return;

    try {
      const payload = await options.getBmoniGateway().getNgnDepositAccount(context.mapping.bmoniUserId);
      const record = findRecord(payload, (candidate) => Boolean(stringValue(candidate, ["accountNumber", "account_number"]))) ?? asRecord(payload);
      const accountNumber = record ? stringValue(record, ["accountNumber", "account_number"]) : undefined;
      if (!record || !accountNumber) return reply.status(502).send({ statusCode: 502, error: "Bad Gateway", message: "BMONI returned an undocumented NGN deposit-account response." });

      return {
        depositAccount: {
          accountNumber,
          accountName: stringValue(record, ["accountName", "accountHolderName", "account_name", "name"]) ?? null,
          bankName: stringValue(record, ["bankName", "bank_name", "bank"]) ?? null,
          currency: "NGN",
          status: normalizeWalletStatus(stringValue(record, ["status", "state"]))
        }
      };
    } catch (error) {
      if (error instanceof BmoniProviderError && error.statusCode === 404) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "An NGN deposit account is not available for this user yet." });
      }
      return handleBmoniError(app, reply, error, "NGN deposit-account lookup");
    }
  });
};

function resolveContext(
  rawLocalUserId: string | undefined,
  userService: BmoniUserService,
  ownership: SqliteWalletOwnershipRepository,
  reply: FastifyReply
) {
  const parsed = localUserIdSchema.safeParse(rawLocalUserId);
  if (!parsed.success) {
    reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "localUserId must be a UUID." });
    return null;
  }

  const mapping = userService.getMapping(parsed.data);
  if (!mapping) {
    reply.status(409).send({ statusCode: 409, error: "Conflict", message: "Create the BMONI user before loading wallet information." });
    return null;
  }

  const wallet = ownership.findByLocalUserId(parsed.data);
  if (!wallet) {
    reply.status(409).send({ statusCode: 409, error: "Conflict", message: "Create the managed CNGN wallet before loading wallet information." });
    return null;
  }

  return { mapping, wallet };
}

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
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

function findBalance(payload: unknown, currency: string): { amount: string } | null {
  const record = findRecord(payload, (candidate) => {
    const code = stringValue(candidate, ["currency", "symbol", "asset", "token", "code"]);
    return code?.toUpperCase() === currency;
  });
  if (!record) return null;

  const amount = stringValue(record, ["availableBalance", "available", "balance", "amount", "total"]);
  return amount === undefined ? null : { amount };
}

function normalizeWalletStatus(status: string | undefined) {
  if (!status) return "unknown";
  const value = status.toLowerCase();
  if (["active", "ready", "enabled", "completed"].includes(value)) return "active";
  if (["pending", "processing", "provisioning", "created"].includes(value)) return "processing";
  if (["failed", "error", "rejected", "disabled", "inactive"].includes(value)) return "inactive";
  return value;
}

function handleBmoniError(app: FastifyInstance, reply: FastifyReply, error: unknown, operation: string) {
  if (error instanceof BmoniConfigurationError) {
    return reply.status(503).send({ statusCode: 503, error: "Service Unavailable", message: "BMONI sandbox access is not configured." });
  }
  if (error instanceof BmoniProviderError) {
    app.log.warn({ errorName: error.name, requestId: error.requestId, statusCode: error.statusCode }, `BMONI ${operation} failed`);
    const statusCode = error.statusCode === 400 || error.statusCode === 404 || error.statusCode === 409 ? error.statusCode : 502;
    return reply.status(statusCode).send({ statusCode, error: "Upstream Error", message: `BMONI rejected the ${operation}.` });
  }
  if (error instanceof BmoniTransportError) return reply.status(503).send({ statusCode: 503, error: "Service Unavailable", message: "BMONI could not be reached." });
  if (error instanceof BmoniResponseValidationError) return reply.status(502).send({ statusCode: 502, error: "Bad Gateway", message: "BMONI returned an undocumented response." });
  throw error;
}
