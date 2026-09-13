import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { PocketRepository } from "../repositories/pocket.js";

const querySchema = z.object({ localUserId: z.uuid() }).strict();
const createSchema = z.object({
  localUserId: z.uuid(),
  name: z.string().trim().min(1).max(64),
  targetAmount: z.number().positive().finite().nullable().optional()
}).strict();

type PocketRouteOptions = { getPocketRepository: () => PocketRepository };

export const pocketRoutes: FastifyPluginAsync<PocketRouteOptions> = async (app, options) => {
  app.get<{ Querystring: unknown }>("/", async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ message: "A valid localUserId is required." });
    const repository = options.getPocketRepository();
    const [pockets, totalAllocated] = await Promise.all([
      repository.list(parsed.data.localUserId),
      repository.totalAllocated(parsed.data.localUserId)
    ]);
    return reply.send({ pockets, summary: { totalAllocated, currency: "NGN", accounting: "internal" } });
  });

  app.post<{ Body: unknown }>("/", async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: "localUserId, pocket name, and optional positive targetAmount are required." });
    const pocket = await options.getPocketRepository().create(parsed.data);
    return reply.status(201).send({ pocket });
  });
};
