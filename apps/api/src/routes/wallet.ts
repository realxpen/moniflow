import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";

import type { PocketRepository } from "../repositories/pocket.js";
import type { WalletOwnershipRepository } from "../repositories/wallet-ownership.js";
import { BmoniConfigurationError, BmoniProviderError, BmoniResponseValidationError, BmoniTransportError, type BmoniGateway } from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";
import { getFinancialProviderDescriptor } from "../services/financial-provider/index.js";

const localUserIdSchema = z.uuid();
type WalletRouteOptions = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
  getWalletOwnershipRepository: () => WalletOwnershipRepository;
  getPocketRepository: () => PocketRepository;
};
type JsonRecord = Record<string, unknown>;

export const walletRoutes: FastifyPluginAsync<WalletRouteOptions> = async (app, options) => {
  app.get<{ Querystring: { localUserId?: string } }>("/", async (request, reply) => {
    const context = await resolveContext(request.query.localUserId, options.getBmoniUserService(), options.getWalletOwnershipRepository(), reply);
    if (!context) return;
    try {
      const payload = await options.getBmoniGateway().getSmartWallet(context.mapping.bmoniUserId, context.wallet.bmoniSmartWalletId);
      const record = findRecord(payload, (candidate) => stringValue(candidate, ["id", "smartWalletId", "walletId", "groupWalletId"]) === context.wallet.bmoniSmartWalletId || stringValue(candidate, ["address", "walletAddress", "smartAccountAddress", "safeAddress"])?.toLowerCase() === context.wallet.smartWalletAddress.toLowerCase()) ?? asRecord(payload);
      if (!record) return reply.status(502).send({ statusCode: 502, error: "Bad Gateway", message: "Provider wallet response was not recognized." });
      return { wallet: { id: stringValue(record, ["smartWalletId", "walletId", "groupWalletId", "id"]) ?? context.wallet.bmoniSmartWalletId, address: stringValue(record, ["address", "walletAddress", "smartAccountAddress", "safeAddress"]) ?? context.wallet.smartWalletAddress, currency: stringValue(record, ["currency", "symbol"]) ?? "CNGN", status: normalizeWalletStatus(stringValue(record, ["status", "state"]), record.isActive) } };
    } catch (error) { return handleProviderError(app, reply, error, "wallet lookup"); }
  });

  app.get<{ Querystring: { localUserId?: string } }>("/balance", async (request, reply) => {
    const context = await resolveContext(request.query.localUserId, options.getBmoniUserService(), options.getWalletOwnershipRepository(), reply);
    if (!context) return;
    try {
      const payload = await options.getBmoniGateway().listAccountBalances(context.mapping.bmoniUserId);
      const balance = findBalance(payload, "CNGN");
      if (!balance) return reply.status(502).send({ statusCode: 502, error: "Bad Gateway", message: "Provider balance response was not recognized." });
      const providerBalance = Number(balance.amount.replace(/,/g, ""));
      if (!Number.isFinite(providerBalance) || providerBalance < 0) return reply.status(502).send({ statusCode: 502, error: "Bad Gateway", message: "Provider balance was invalid." });
      const internalAllocated = await options.getPocketRepository().totalAllocated(context.mapping.localUserId);
      const availableToSpend = Math.max(0, providerBalance - internalAllocated);
      const provider = getFinancialProviderDescriptor(options.getBmoniGateway());
      return { balance: { amount: providerBalance.toFixed(2), providerBalance: providerBalance.toFixed(2), internalAllocated: internalAllocated.toFixed(2), availableToSpend: availableToSpend.toFixed(2), currency: "CNGN", fiatCurrency: "NGN", source: provider.id, simulated: provider.simulated } };
    } catch (error) { return handleProviderError(app, reply, error, "balance lookup"); }
  });

  app.get<{ Querystring: { localUserId?: string } }>("/deposit-account", async (request, reply) => {
    const context = await resolveContext(request.query.localUserId, options.getBmoniUserService(), options.getWalletOwnershipRepository(), reply);
    if (!context) return;
    try {
      const payload = await options.getBmoniGateway().getNgnDepositAccount(context.mapping.bmoniUserId);
      const record = findRecord(payload, (candidate) => Boolean(stringValue(candidate, ["accountNumber", "account_number"]))) ?? asRecord(payload);
      const accountNumber = record ? stringValue(record, ["accountNumber", "account_number"]) : undefined;
      if (!record || !accountNumber) return reply.status(502).send({ statusCode: 502, error: "Bad Gateway", message: "Provider deposit-account response was not recognized." });
      return { depositAccount: { accountNumber, accountName: stringValue(record, ["accountName", "accountHolderName", "account_name", "name"]) ?? null, bankName: stringValue(record, ["bankName", "bank_name", "bank"]) ?? null, currency: "NGN", status: normalizeWalletStatus(stringValue(record, ["status", "state"]), record.isActive) } };
    } catch (error) {
      if (error instanceof BmoniProviderError && error.statusCode === 404) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "An NGN deposit account is not available for this user yet." });
      return handleProviderError(app, reply, error, "deposit-account lookup");
    }
  });
};

async function resolveContext(rawLocalUserId: string | undefined, userService: BmoniUserService, ownership: WalletOwnershipRepository, reply: FastifyReply) {
  const parsed = localUserIdSchema.safeParse(rawLocalUserId);
  if (!parsed.success) { reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "localUserId must be a UUID." }); return null; }
  const mapping = await userService.getMapping(parsed.data);
  if (!mapping) { reply.status(409).send({ statusCode: 409, error: "Conflict", message: "Create the provider user before loading wallet information." }); return null; }
  const wallet = await ownership.findByLocalUserId(parsed.data);
  if (!wallet) { reply.status(409).send({ statusCode: 409, error: "Conflict", message: "Create the managed CNGN wallet before loading wallet information." }); return null; }
  return { mapping, wallet };
}
function asRecord(value: unknown): JsonRecord | null { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null; }
function findRecord(value: unknown, predicate: (record: JsonRecord) => boolean): JsonRecord | null { if (Array.isArray(value)) { for (const item of value) { const found = findRecord(item, predicate); if (found) return found; } return null; } const record = asRecord(value); if (!record) return null; if (predicate(record)) return record; for (const child of Object.values(record)) { const found = findRecord(child, predicate); if (found) return found; } return null; }
function stringValue(record: JsonRecord, keys: string[]): string | undefined { for (const key of keys) { const value = record[key]; if (typeof value === "string" && value.trim()) return value; if (typeof value === "number" && Number.isFinite(value)) return String(value); } return undefined; }
function findBalance(payload: unknown, currency: string): { amount: string } | null { const record = findRecord(payload, (candidate) => stringValue(candidate, ["currency", "symbol", "asset", "token", "code"])?.toUpperCase() === currency); if (!record) return null; const amount = stringValue(record, ["availableBalance", "available", "balance", "amount", "total"]); return amount === undefined ? null : { amount }; }
function normalizeWalletStatus(status: string | undefined, isActive: unknown) { if (!status) return isActive === true ? "active" : isActive === false ? "processing" : "unknown"; const value = status.toLowerCase(); if (["active", "ready", "enabled", "completed"].includes(value)) return "active"; if (["pending", "processing", "provisioning", "created", "preparing"].includes(value)) return "processing"; if (["failed", "error", "rejected", "disabled", "inactive"].includes(value)) return "inactive"; return value; }
function handleProviderError(app: FastifyInstance, reply: FastifyReply, error: unknown, operation: string) { if (error instanceof BmoniConfigurationError) return reply.status(503).send({ statusCode: 503, error: "Service Unavailable", message: "The selected provider is not configured." }); if (error instanceof BmoniProviderError) { app.log.warn({ errorName: error.name, requestId: error.requestId, statusCode: error.statusCode }, `Provider ${operation} failed`); const statusCode = [400, 404, 409].includes(error.statusCode) ? error.statusCode : 502; return reply.status(statusCode).send({ statusCode, error: "Upstream Error", message: `Provider rejected the ${operation}.`, requestId: error.requestId }); } if (error instanceof BmoniTransportError) return reply.status(503).send({ statusCode: 503, error: "Service Unavailable", message: "The provider could not be reached." }); if (error instanceof BmoniResponseValidationError) return reply.status(502).send({ statusCode: 502, error: "Bad Gateway", message: "Provider returned an undocumented response." }); throw error; }
