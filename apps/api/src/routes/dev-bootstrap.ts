import { createHash } from "node:crypto";

import type { FastifyPluginAsync } from "fastify";

import { env } from "../config/env.js";
import type { WalletOwnershipRepository } from "../repositories/wallet-ownership.js";
import type { BmoniGateway } from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";
import { getFinancialProviderDescriptor } from "../services/financial-provider/index.js";

const localUserId = "11111111-1111-4111-8111-111111111111";
const ownerSignature = `0x${"11".repeat(65)}`;
const sandboxPhone = ["+234", "800", "000", "0099"].join("");

type DevBootstrapOptions = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
  getWalletOwnershipRepository: () => WalletOwnershipRepository;
};

export const devBootstrapRoutes: FastifyPluginAsync<DevBootstrapOptions> = async (app, options) => {
  app.post("/bootstrap", async (_request, reply) => {
    const gateway = options.getBmoniGateway();
    const provider = getFinancialProviderDescriptor(gateway);
    if (env.NODE_ENV === "production") return reply.status(404).send({ message: "Development bootstrap is disabled in production." });
    if (provider.id !== "moniflow-sandbox") return reply.status(409).send({ message: "Set FINANCIAL_PROVIDER=moniflow-sandbox before using development bootstrap." });

    const identity = await options.getBmoniUserService().createOrFindMapping({
      localUserId,
      firstName: "MONIFlow",
      lastName: "Sandbox",
      email: "sandbox@moniflow.local",
      phoneNumber: sandboxPhone
    });

    const ownership = options.getWalletOwnershipRepository();
    let wallet = await ownership.findByLocalUserId(localUserId);
    if (!wallet) {
      const ownerAddress = sandboxOwnerAddress(localUserId);
      const challenge = await gateway.createOwnerProofChallenge(identity.bmoniUserId, { currency: "CNGN", userOwnerAddress: ownerAddress });
      const managed = await gateway.createManagedSmartWallet(identity.bmoniUserId, { currency: "CNGN", userOwnerAddress: ownerAddress, ownerProofChallengeId: challenge.challengeId, ownerProofSignature: ownerSignature });
      const walletId = managed.smartWalletId ?? managed.id;
      if (!walletId) throw new Error("MONIFlow sandbox returned no wallet identifier.");
      const now = new Date().toISOString();
      wallet = await ownership.save({ localUserId, ownerAddress, bmoniSmartWalletId: walletId, smartWalletAddress: managed.address, currency: "CNGN", createdAt: now, updatedAt: now });
    }

    return reply.status(identity.status === "created" ? 201 : 200).send({
      provider,
      identity: { localUserId: identity.localUserId, providerUserId: identity.bmoniUserId, status: identity.status },
      wallet,
      balances: await gateway.listAccountBalances(identity.bmoniUserId)
    });
  });
};

function sandboxOwnerAddress(value: string) {
  return `0x${createHash("sha256").update(`moniflow-sandbox-owner:${value}`).digest("hex").slice(0, 40)}`;
}
