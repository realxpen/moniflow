import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import { createMoniflowUserInputSchema } from "../schemas/onboarding.js";
import {
  BmoniConfigurationError,
  BmoniProviderError,
  BmoniResponseValidationError,
  BmoniTransportError,
  summarizeBmoniProviderPayload
} from "../services/bmoni/index.js";
import {
  BmoniUserService,
  UserMappingConflictError
} from "../services/bmoni/user-service.js";

type OnboardingRouteOptions = {
  getBmoniUserService: () => BmoniUserService;
};

export const onboardingRoutes: FastifyPluginAsync<OnboardingRouteOptions> = async (app, options) => {
  const createUser = async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
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
      return reply.status(result.status === "created" ? 201 : 200).send({
        ...result,
        provisioningState: result.status === "created" ? "CREATED" : "EXISTING_LOCAL_MAPPING"
      });
    } catch (error) {
      if (error instanceof UserMappingConflictError) {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          provisioningState: "RECONCILIATION_REQUIRED",
          retryable: false,
          message: "The local identity cannot be safely associated with this BMONI user. Reconciliation is required."
        });
      }

      if (error instanceof BmoniConfigurationError) {
        return reply.status(503).send({
          statusCode: 503,
          error: "Service Unavailable",
          provisioningState: "NOT_CONFIGURED",
          retryable: false,
          message: "BMONI sandbox access is not configured."
        });
      }

      if (error instanceof BmoniProviderError) {
        const reconciliationDiagnostics =
          error.statusCode === 409
            ? summarizeBmoniProviderPayload(error.providerError)
            : undefined;

        app.log.warn(
          {
            errorName: error.name,
            requestId: error.requestId,
            statusCode: error.statusCode,
            ...(reconciliationDiagnostics ? { reconciliationDiagnostics } : {})
          },
          "BMONI user creation failed"
        );

        const statusCode = error.statusCode === 400 ? 400 : error.statusCode === 409 ? 409 : 502;
        if (statusCode === 409) {
          return reply.status(409).send({
            statusCode: 409,
            error: "Conflict",
            provisioningState: "RECONCILIATION_REQUIRED",
            retryable: false,
            message: "BMONI already has a matching sandbox identity, but MONIFlow has no persisted mapping for it. Reconciliation is required.",
            requestId: error.requestId
          });
        }

        return reply.status(statusCode).send({
          statusCode,
          error: "Upstream Error",
          provisioningState: "NOT_CREATED",
          retryable: statusCode >= 500,
          message: "BMONI did not accept the user-creation request.",
          requestId: error.requestId
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
          provisioningState: "OUTCOME_UNKNOWN",
          retryable: false,
          message: "The BMONI request outcome is unknown. MONIFlow will not automatically retry user creation."
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
          provisioningState: "OUTCOME_UNKNOWN",
          retryable: false,
          message: "BMONI returned an undocumented response after user creation.",
          requestId: error.requestId
        });
      }

      throw error;
    }
  };

  app.post<{ Body: unknown }>("/user", createUser);
  app.post<{ Body: unknown }>("/users", createUser);
};
