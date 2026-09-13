import { createHash, randomUUID } from "node:crypto";

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { env } from "../config/env.js";
import type { BankAccountRepository } from "../repositories/bank-account.js";
import type { WalletOwnershipRepository } from "../repositories/wallet-ownership.js";
import type { BmoniGateway } from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";
import { getFinancialProviderDescriptor } from "../services/financial-provider/index.js";

const defaultLocalUserId = "11111111-1111-4111-8111-111111111111";
const ownerSignature = `0x${"11".repeat(65)}`;
const bootstrapBodySchema = z.object({ localUserId: z.uuid().optional() }).strict();
const canonicalInstruction = "Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.";

type DevBootstrapOptions = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
  getWalletOwnershipRepository: () => WalletOwnershipRepository;
  getBankAccountRepository: () => BankAccountRepository;
};

type JsonRecord = Record<string, unknown>;

export const devBootstrapRoutes: FastifyPluginAsync<DevBootstrapOptions> = async (_app, options) => {
  const runBootstrap = async (localUserId: string) => bootstrapDemo(options, localUserId);

  _app.post<{ Body: unknown }>("/bootstrap", async (request, reply) => {
    const parsed = bootstrapBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ message: "localUserId must be a UUID when supplied." });
    const blocked = requireSandbox(options.getBmoniGateway(), reply);
    if (blocked) return blocked;
    const state = await runBootstrap(parsed.data.localUserId ?? defaultLocalUserId);
    return reply.status(state.identity.status === "created" ? 201 : 200).send(state);
  });

  _app.post("/reset", async (_request, reply) => {
    const blocked = requireSandbox(options.getBmoniGateway(), reply);
    if (blocked) return blocked;
    const freshLocalUserId = randomUUID();
    const state = await runBootstrap(freshLocalUserId);
    return reply.status(201).send({
      ...state,
      reset: {
        strategy: "fresh_demo_identity",
        previousHistoryPreserved: true,
        localUserId: freshLocalUserId
      }
    });
  });
};

async function bootstrapDemo(options: DevBootstrapOptions, localUserId: string) {
  const gateway = options.getBmoniGateway();
  const provider = getFinancialProviderDescriptor(gateway);
  const compact = localUserId.replace(/-/g, "");
  const identity = await options.getBmoniUserService().createOrFindMapping({
    localUserId,
    firstName: "MONIFlow",
    lastName: "Sandbox",
    email: `sandbox+${compact.slice(0, 12)}@moniflow.local`,
    phoneNumber: "+2348000000099"
  });

  const ownership = options.getWalletOwnershipRepository();
  let wallet = await ownership.findByLocalUserId(localUserId);
  if (!wallet) {
    const ownerAddress = sandboxOwnerAddress(localUserId);
    const challenge = await gateway.createOwnerProofChallenge(identity.bmoniUserId, {
      currency: "CNGN",
      userOwnerAddress: ownerAddress
    });
    const managed = await gateway.createManagedSmartWallet(identity.bmoniUserId, {
      currency: "CNGN",
      userOwnerAddress: ownerAddress,
      ownerProofChallengeId: challenge.challengeId,
      ownerProofSignature: ownerSignature
    });
    const walletId = managed.smartWalletId ?? managed.id;
    if (!walletId) throw new Error("MONIFlow sandbox returned no wallet identifier.");
    const now = new Date().toISOString();
    wallet = await ownership.save({
      localUserId,
      ownerAddress,
      bmoniSmartWalletId: walletId,
      smartWalletAddress: managed.address,
      currency: "CNGN",
      createdAt: now,
      updatedAt: now
    });
  }

  await gateway.startNigeriaOnboarding(identity.bmoniUserId, {
    bvn: "SANDBOX_BVN",
    ngnWalletAddress: wallet.smartWalletAddress,
    ngnWalletIndex: 0
  });
  const depositAccount = await gateway.createNgnVirtualAccount(identity.bmoniUserId, wallet.bmoniSmartWalletId);

  const providerBank = await gateway.registerNigerianWithdrawalAccount(identity.bmoniUserId, {
    accountNumber: "SANDBOX_ACCOUNT",
    bankCode: "SANDBOX_GTB",
    bankName: "Guaranty Trust Bank",
    accountHolderName: "MONIFLOW SANDBOX USER"
  });
  const providerAccountId = findText(providerBank, ["id", "accountId", "bankAccountId", "withdrawalAccountId"]);
  if (!providerAccountId) throw new Error("MONIFlow sandbox returned no withdrawal account identifier.");

  const now = new Date().toISOString();
  const bank = await options.getBankAccountRepository().saveVerified({
    id: randomUUID(),
    localUserId,
    label: "GTBank",
    providerAccountId,
    bankCode: "SANDBOX_GTB",
    bankName: "Guaranty Trust Bank",
    maskedAccountNumber: "SANDBOX",
    accountHolderName: "MONIFLOW SANDBOX USER",
    verified: true,
    createdAt: now,
    updatedAt: now
  });

  return {
    provider,
    identity: { localUserId: identity.localUserId, providerUserId: identity.bmoniUserId, status: identity.status },
    wallet,
    nigeriaRail: await gateway.getOnboardingStatus(identity.bmoniUserId),
    depositAccount,
    bankDestination: bank,
    balances: await gateway.listAccountBalances(identity.bmoniUserId),
    canonicalInstruction
  };
}

function requireSandbox(gateway: BmoniGateway, reply: any) {
  const provider = getFinancialProviderDescriptor(gateway);
  if (env.NODE_ENV === "production") return reply.status(404).send({ message: "Development bootstrap is disabled in production." });
  if (provider.id !== "moniflow-sandbox") return reply.status(409).send({ message: "Set FINANCIAL_PROVIDER=moniflow-sandbox before using demo bootstrap/reset." });
  return null;
}

function sandboxOwnerAddress(value: string) {
  return `0x${createHash("sha256").update(`moniflow-sandbox-owner:${value}`).digest("hex").slice(0, 40)}`;
}

function findText(payload: unknown, keys: string[]): string | null {
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = findText(item, keys);
      if (found) return found;
    }
    return null;
  }
  if (payload === null || typeof payload !== "object") return null;
  const record = payload as JsonRecord;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  for (const value of Object.values(record)) {
    const found = findText(value, keys);
    if (found) return found;
  }
  return null;
}
