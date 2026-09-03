import type { FastifyPluginAsync } from "fastify";

import { env } from "../config/env.js";
import {
  BmoniConfigurationError,
  BmoniProviderError,
  BmoniResponseValidationError,
  BmoniTransportError,
  type BmoniGateway
} from "../services/bmoni/index.js";

type HealthRouteOptions = {
  getBmoniGateway: () => BmoniGateway;
};

export const healthRoutes: FastifyPluginAsync<HealthRouteOptions> = async (
  app,
  options
) => {
  app.get("/health", async () => ({
    status: "ok",
    service: "moniflow-api",
    environment: env.NODE_ENV
  }));

  app.get("/health/bmoni", async (_request, reply) => {
    try {
      const result = await options.getBmoniGateway().getSupportedSmartWalletCurrencies();

      return {
        status: "ok",
        service: "bmoni",
        environment: "sandbox",
        currencies: result.currencies
      };
    } catch (error) {
      if (error instanceof BmoniConfigurationError) {
        return reply.status(503).send({
          status: "unavailable",
          service: "bmoni",
          environment: "sandbox",
          reason: "not_configured"
        });
      }

      if (error instanceof BmoniResponseValidationError) {
        app.log.error(
          { errorName: error.name, requestId: error.requestId },
          "BMONI contract validation failed"
        );
        return reply.status(502).send({
          status: "unavailable",
          service: "bmoni",
          environment: "sandbox",
          reason: "contract_mismatch"
        });
      }

      if (error instanceof BmoniProviderError || error instanceof BmoniTransportError) {
        app.log.warn(
          {
            errorName: error.name,
            requestId: error instanceof BmoniProviderError ? error.requestId : null,
            statusCode: error instanceof BmoniProviderError ? error.statusCode : null,
            timedOut: error instanceof BmoniTransportError ? error.timedOut : false
          },
          "BMONI connectivity check failed"
        );
        return reply.status(503).send({
          status: "unavailable",
          service: "bmoni",
          environment: "sandbox",
          reason: "provider_unavailable"
        });
      }

      throw error;
    }
  });
};
