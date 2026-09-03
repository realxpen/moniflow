import Fastify from "fastify";

import { env } from "./config/env.js";
import { SqliteUserMappingRepository } from "./repositories/sqlite-user-mapping.js";
import { activityRoutes } from "./routes/activity.js";
import { bankingRoutes } from "./routes/banking.js";
import { healthRoutes } from "./routes/health.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { operatorRoutes } from "./routes/operator.js";
import { pocketRoutes } from "./routes/pockets.js";
import { walletRoutes } from "./routes/wallet.js";
import { createBmoniGateway, type BmoniGateway } from "./services/bmoni/index.js";
import { BmoniUserService } from "./services/bmoni/user-service.js";

export type AppDependencies = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
};

function createRuntimeDependencies() {
  let gateway: BmoniGateway | undefined;
  let mappings: SqliteUserMappingRepository | undefined;
  let userService: BmoniUserService | undefined;

  const getBmoniGateway = () => {
    gateway ??= createBmoniGateway();
    return gateway;
  };

  return {
    dependencies: {
      getBmoniGateway,
      getBmoniUserService: () => {
        mappings ??= new SqliteUserMappingRepository(env.DATABASE_URL);
        userService ??= new BmoniUserService(getBmoniGateway(), mappings);
        return userService;
      }
    } satisfies AppDependencies,
    close: () => mappings?.close()
  };
}

export const buildApp = (dependencyOverrides?: AppDependencies) => {
  const runtime = dependencyOverrides ? null : createRuntimeDependencies();
  const dependencies = dependencyOverrides ?? runtime?.dependencies;
  if (!dependencies) {
    throw new Error("MONIFlow API dependencies could not be initialized.");
  }

  const app = Fastify({
    logger: {
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers.x-api-key",
        "headers.authorization",
        "headers.x-api-key",
        "BMONI_API_KEY"
      ]
    }
  });

  app.register(healthRoutes, {
    getBmoniGateway: dependencies.getBmoniGateway
  });
  app.register(onboardingRoutes, {
    prefix: "/onboarding",
    getBmoniUserService: dependencies.getBmoniUserService
  });
  app.register(walletRoutes, { prefix: "/wallet" });
  app.register(bankingRoutes, { prefix: "/banking" });
  app.register(operatorRoutes, { prefix: "/operator" });
  app.register(activityRoutes, { prefix: "/activity" });
  app.register(pocketRoutes, { prefix: "/pockets" });

  if (runtime) {
    app.addHook("onClose", async () => runtime.close());
  }

  return app;
};
