import { randomUUID } from "node:crypto";

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { BankAccountRepository } from "../repositories/bank-account.js";
import type { BmoniGateway } from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";

const localUserQuerySchema = z.object({ localUserId: z.uuid() }).strict();
const verifyBodySchema = z.object({
  localUserId: z.uuid(),
  bankCode: z.string().trim().min(1),
  accountNumber: z.string().regex(/^\d{10}$/)
}).strict();
const registerBodySchema = z.object({
  localUserId: z.uuid(),
  label: z.string().trim().min(1).max(64),
  bankCode: z.string().trim().min(1),
  bankName: z.string().trim().min(1),
  accountNumber: z.string().regex(/^\d{10}$/),
  accountHolderName: z.string().trim().min(1)
}).strict();

type BankingRouteOptions = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
  getBankAccountRepository: () => BankAccountRepository;
};

type JsonRecord = Record<string, unknown>;

export const bankingRoutes: FastifyPluginAsync<BankingRouteOptions> = async (app, options) => {
  app.get<{ Querystring: unknown }>("/", async (request, reply) => {
    const parsed = localUserQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ message: "A valid localUserId is required." });
    const mapping = await options.getBmoniUserService().getMapping(parsed.data.localUserId);
    if (!mapping) return reply.status(409).send({ message: "Create the BMONI user first." });

    const payload = await options.getBmoniGateway().getNigerianBanks(mapping.bmoniUserId);
    const banks = extractBanks(payload);
    if (banks.length === 0) return reply.status(502).send({ message: "BMONI returned an undocumented Nigerian bank-list response." });
    return reply.send({ banks });
  });

  app.post<{ Body: unknown }>("/verify", async (request, reply) => {
    const parsed = verifyBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: "localUserId, bankCode, and a 10-digit accountNumber are required." });
    const mapping = await options.getBmoniUserService().getMapping(parsed.data.localUserId);
    if (!mapping) return reply.status(409).send({ message: "Create the BMONI user first." });

    const payload = await options.getBmoniGateway().verifyNigerianAccount(mapping.bmoniUserId, {
      bankCode: parsed.data.bankCode,
      accountNumber: parsed.data.accountNumber
    });
    const accountHolderName = extractText(payload, ["accountName", "accountHolderName"]);
    if (!accountHolderName) return reply.status(502).send({ message: "BMONI verification returned no account-holder name." });
    return reply.send({ verified: true, accountHolderName });
  });

  app.post<{ Body: unknown }>("/register", async (request, reply) => {
    const parsed = registerBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: "A verified Nigerian bank destination payload is required." });
    const mapping = await options.getBmoniUserService().getMapping(parsed.data.localUserId);
    if (!mapping) return reply.status(409).send({ message: "Create the BMONI user first." });

    // Re-verify on the server so a client cannot forge the holder name that BMONI requires verbatim.
    const verification = await options.getBmoniGateway().verifyNigerianAccount(mapping.bmoniUserId, {
      bankCode: parsed.data.bankCode,
      accountNumber: parsed.data.accountNumber
    });
    const verifiedName = extractText(verification, ["accountName", "accountHolderName"]);
    if (!verifiedName || verifiedName !== parsed.data.accountHolderName) {
      return reply.status(409).send({ message: "Bank verification changed. Verify the account again before registering it." });
    }

    const registered = await options.getBmoniGateway().registerNigerianWithdrawalAccount(mapping.bmoniUserId, {
      accountNumber: parsed.data.accountNumber,
      bankCode: parsed.data.bankCode,
      bankName: parsed.data.bankName,
      accountHolderName: verifiedName
    });
    const providerAccountId = extractText(registered, ["id"]);
    if (!providerAccountId) return reply.status(502).send({ message: "BMONI returned no withdrawal-account id." });

    const now = new Date().toISOString();
    const saved = await options.getBankAccountRepository().saveVerified({
      id: randomUUID(),
      localUserId: parsed.data.localUserId,
      label: parsed.data.label,
      providerAccountId,
      bankCode: parsed.data.bankCode,
      bankName: parsed.data.bankName,
      maskedAccountNumber: `•••• ${parsed.data.accountNumber.slice(-4)}`,
      accountHolderName: verifiedName,
      verified: true,
      createdAt: now,
      updatedAt: now
    });

    return reply.status(201).send({ destination: saved });
  });

  app.get<{ Querystring: unknown }>("/saved", async (request, reply) => {
    const parsed = z.object({ localUserId: z.uuid(), label: z.string().trim().min(1) }).strict().safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ message: "localUserId and label are required." });
    const destination = await options.getBankAccountRepository().findVerifiedByLabel(parsed.data.localUserId, parsed.data.label);
    if (!destination) return reply.status(404).send({ message: "Verified bank destination not found." });
    return reply.send({ destination });
  });
};

function extractBanks(payload: unknown): Array<{ name: string; code: string }> {
  const list = findArray(payload, ["banks", "data", "value"]);
  const banks: Array<{ name: string; code: string }> = [];
  for (const item of list) {
    const record = asRecord(item);
    if (!record) continue;
    const name = text(record.name) ?? text(record.bankName);
    const code = text(record.code) ?? text(record.bankCode) ?? text(record.cbnCode);
    if (name && code) banks.push({ name, code });
  }
  return banks;
}

function extractText(payload: unknown, keys: string[]): string | null {
  const walk = (value: unknown, depth: number): string | null => {
    if (depth > 4) return null;
    const record = asRecord(value);
    if (!record) return null;
    for (const key of keys) {
      const candidate = text(record[key]);
      if (candidate) return candidate;
    }
    for (const key of ["data", "value", "account", "withdrawalAccount"]) {
      const found = walk(record[key], depth + 1);
      if (found) return found;
    }
    return null;
  };
  return walk(payload, 0);
}

function findArray(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    const nested = findArray(value, keys);
    if (nested.length) return nested;
  }
  return [];
}

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}
function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
