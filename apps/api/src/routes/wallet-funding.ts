import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { WalletOwnershipRepository } from "../repositories/wallet-ownership.js";
import { BmoniProviderError, type BmoniGateway } from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";

const bodySchema = z.object({ localUserId: z.uuid() }).strict();

type WalletFundingRouteOptions = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
  getWalletOwnershipRepository: () => WalletOwnershipRepository;
};

export const walletFundingRoutes: FastifyPluginAsync<WalletFundingRouteOptions> = async (app, options) => {
  app.post<{ Body: unknown }>("/deposit-account", async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: "A valid localUserId is required." });

    const mapping = await options.getBmoniUserService().getMapping(parsed.data.localUserId);
    if (!mapping) return reply.status(409).send({ message: "Create the BMONI user before creating an NGN deposit account." });
    const wallet = await options.getWalletOwnershipRepository().findByLocalUserId(parsed.data.localUserId);
    if (!wallet) return reply.status(409).send({ message: "Create the managed CNGN wallet before creating an NGN deposit account." });

    const gateway = options.getBmoniGateway();
    try {
      const existing = await gateway.getNgnDepositAccount(mapping.bmoniUserId);
      return reply.send({ status: "existing", depositAccount: existing });
    } catch (error) {
      if (!(error instanceof BmoniProviderError && error.statusCode === 404)) throw error;
    }

    const created = await gateway.createNgnVirtualAccount(mapping.bmoniUserId, wallet.bmoniSmartWalletId);
    return reply.status(201).send({ status: "created", depositAccount: created });
  });
};
