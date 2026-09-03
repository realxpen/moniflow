import type { FastifyPluginAsync } from "fastify";

import { createMoniflowUserInputSchema } from "../schemas/onboarding.js";
import {
  BmoniConfigurationError,
  BmoniProviderError,
  BmoniResponseValidationError,
  BmoniTransportError
} from "../services/bmoni/index.js";
import {
  BmoniUserService,
  UserMappingConflictError
} from "../services/bmoni/user-service.js";

type OnboardingRouteOptions = {
  getBmoniUserService: () => BmoniUserService;
};

export const onboardingRoutes: FastifyPluginAsync<OnboardingRouteOptions> = async (
  app,
  options
) => {
  app.post<{ Body: unknown }>("/users", async (request, reply) => {
    const input = createMoniflowUserInputSchema.safeParse(request.body);
    if (!input.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "The onboarding request is invalid.",
        fields: input.error.issues.map((issue) => issue.path.join("."))
      });
    }

    try {
      const result = await options.getBmoniUserService().createOrFindMapping(input.data);
      return reply.status(result.status === "created" ? 201 : 200).send(result);
    } catch (error) {
      if (error instanceof UserMappingConflictError) {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "The local identity cannot be safely associated with this BMONI user."
        });
      }

      if (error instanceof BmoniConfigurationError) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message: "BMONI sandbox access is not configured."
        });
      }

      if (error instanceof BmoniProviderError) {
        app.log.warn(
          {
            errorName: error.name,
            requestId: error.requestId,
            statusCode: error.statusCode
          },
          "BMONI user creation failed"
        );

        const statusCode = error.statusCode === 400 ? 400 : error.statusCode === 409 ? 409 : 502;
        return reply.status(statusCode).send({
          statusCode,
          error: statusCode === 409 ? "Conflict" : "Upstream Error",
          message:
            statusCode === 409
              ? "A matching BMONI user may already exist. No automatic retry was performed; reconciliation is required."
              : "BMONI did not accept the user-creation request."
        });
      }

      if (error instanceof BmoniTransportError) {
        app.log.warn(
          { errorName: error.name, timedOut: error.timedOut },
          "BMONI user creation transport failure"
        );
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          message:
            "The BMONI request outcome is unknown. No automatic retry will occur because user creation has no idempotency key."
        });
      }

      if (error instanceof BmoniResponseValidationError) {
        app.log.error(
          { errorName: error.name, requestId: error.requestId },
          "BMONI user response failed contract validation"
        );
        return reply.status(502).send({
          statusCode: 502,
          error: "Bad Gateway",
          message: "BMONI returned an undocumented response."
        });
      }

      throw error;
    }
  });
};
