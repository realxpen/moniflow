import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { moniflowIntentSchema } from "../schemas/intent.js";
import { parseIntent } from "../services/intent/parser.js";

const parseIntentBodySchema = z.object({
  input: z.string().max(500)
}).strict();

export const operatorRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: unknown }>("/intent", async (request, reply) => {
    const parsed = parseIntentBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "input must be a string up to 500 characters."
      });
    }

    const intent = moniflowIntentSchema.parse(parseIntent(parsed.data.input));
    return reply.send({ intent });
  });
};
