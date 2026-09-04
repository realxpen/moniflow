import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { env } from "../config/env.js";
import { SqliteWalletOwnershipRepository } from "../repositories/sqlite-wallet-ownership.js";
import {
  BmoniProviderError,
  BmoniResponseValidationError,
  BmoniTransportError,
  type BmoniGateway
} from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";

const localUserIdSchema = z.uuid();
const ownerAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const challengeBodySchema = z.object({
  localUserId: localUserIdSchema,
  ownerAddress: ownerAddressSchema
}).strict();

const createWalletBodySchema = z.object({
  localUserId: localUserIdSchema,
  ownerAddress: ownerAddressSchema,
  challengeId: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/)
}).strict();

type WalletOwnershipRouteOptions = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
};

export const walletOwnershipRoutes: FastifyPluginAsync<WalletOwnershipRouteOptions> = async (app, options) => {
  const ownership = new SqliteWalletOwnershipRepository(env.DATABASE_URL);
  app.addHook("onClose", async () => ownership.close());

  app.get<{ Querystring: { localUserId?: string } }>("/status", async (request, reply) => {
    const parsed = localUserIdSchema.safeParse(request.query.localUserId);
    if (!parsed.success) return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "localUserId must be a UUID." });
    const result = ownership.findByLocalUserId(parsed.data);
    return { status: result ? "created" : "not_created", wallet: result };
  });

  app.post<{ Body: unknown }>("/owner-proof-challenge", async (request, reply) => {
    const parsed = challengeBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "Invalid owner proof request." });
    const mapping = options.getBmoniUserService().getMapping(parsed.data.localUserId);
    if (!mapping) return reply.status(409).send({ statusCode: 409, error: "Conflict", message: "Create the BMONI user before provisioning its wallet." });

    try {
      const challenge = await options.getBmoniGateway().createOwnerProofChallenge(mapping.bmoniUserId, {
        currency: "CNGN",
        userOwnerAddress: parsed.data.ownerAddress
      });
      return reply.status(201).send(challenge);
    } catch (error) {
      return handleBmoniError(app, reply, error, "owner proof challenge");
    }
  });

  app.post<{ Body: unknown }>("/create-managed", async (request, reply) => {
    const parsed = createWalletBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "Invalid managed wallet request." });
    const mapping = options.getBmoniUserService().getMapping(parsed.data.localUserId);
    if (!mapping) return reply.status(409).send({ statusCode: 409, error: "Conflict", message: "Create the BMONI user before provisioning its wallet." });

    try {
      const wallet = await options.getBmoniGateway().createManagedSmartWallet(mapping.bmoniUserId, {
        currency: "CNGN",
        userOwnerAddress: parsed.data.ownerAddress,
        ownerProofChallengeId: parsed.data.challengeId,
        ownerProofSignature: parsed.data.signature
      });
      const now = new Date().toISOString();
      const existing = ownership.findByLocalUserId(parsed.data.localUserId);
      const saved = ownership.save({
        localUserId: parsed.data.localUserId,
        ownerAddress: parsed.data.ownerAddress,
        bmoniSmartWalletId: wallet.smartWalletId ?? wallet.id!,
        smartWalletAddress: wallet.address,
        currency: "CNGN",
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      });
      return reply.status(existing ? 200 : 201).send({ status: "created", wallet: saved });
    } catch (error) {
      return handleBmoniError(app, reply, error, "managed wallet creation");
    }
  });
};

function handleBmoniError(app: Parameters<FastifyPluginAsync>[0], reply: any, error: unknown, operation: string) {
  if (error instanceof BmoniProviderError) {
    app.log.warn({ errorName: error.name, requestId: error.requestId, statusCode: error.statusCode }, `BMONI ${operation} failed`);
    return reply.status(error.statusCode === 400 || error.statusCode === 409 ? error.statusCode : 502).send({ statusCode: error.statusCode, error: "Upstream Error", message: `BMONI rejected the ${operation}.` });
  }
  if (error instanceof BmoniTransportError) return reply.status(503).send({ statusCode: 503, error: "Service Unavailable", message: "BMONI could not be reached." });
  if (error instanceof BmoniResponseValidationError) return reply.status(502).send({ statusCode: 502, error: "Bad Gateway", message: "BMONI returned an undocumented wallet response." });
  throw error;
}
