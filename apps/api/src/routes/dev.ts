import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import {
  BmoniConfigurationError,
  BmoniProviderError,
  BmoniResponseValidationError,
  BmoniTransportError,
  type BmoniGateway
} from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";

const querySchema = z.object({ localUserId: z.uuid().optional() }).strict();
const environment = "sandbox" as const;

type DevRouteOptions = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
};

export const devRoutes: FastifyPluginAsync<DevRouteOptions> = async (app, options) => {
  app.get<{ Querystring: unknown }>("/bmoni-status", async (request, reply) => {
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "localUserId must be a valid UUID when supplied."
      });
    }

    try {
      const currencies = await options.getBmoniGateway().getSupportedSmartWalletCurrencies();
      const mapping = query.data.localUserId
        ? options.getBmoniUserService().getMapping(query.data.localUserId)
        : null;

      return reply.send({
        bmoniApi: "connected",
        environment,
        supportedCurrencies: currencies.currencies,
        user: mapping
          ? {
              status: "created",
              bmoniUserId: mapping.bmoniUserId,
              localUserId: mapping.localUserId
            }
          : { status: "not_created", bmoniUserId: null }
      });
    } catch (error) {
      if (
        error instanceof BmoniConfigurationError ||
        error instanceof BmoniTransportError ||
        error instanceof BmoniProviderError ||
        error instanceof BmoniResponseValidationError
      ) {
        app.log.warn({ errorName: error.name }, "BMONI debug status check failed");
        return reply.status(503).send({
          bmoniApi: "disconnected",
          environment,
          user: { status: "unknown", bmoniUserId: null }
        });
      }

      throw error;
    }
  });
};
