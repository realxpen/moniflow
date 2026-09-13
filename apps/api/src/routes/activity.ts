import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { ActivityRepository } from "../repositories/activity.js";

const querySchema = z.object({
  localUserId: z.uuid(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50)
}).strict();

type ActivityRouteOptions = { getActivityRepository: () => ActivityRepository };

export const activityRoutes: FastifyPluginAsync<ActivityRouteOptions> = async (app, options) => {
  app.get<{ Querystring: unknown }>("/", async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ message: "A valid localUserId is required." });
    const activity = await options.getActivityRepository().list(parsed.data.localUserId, parsed.data.limit);
    return reply.send({ activity });
  });
};
