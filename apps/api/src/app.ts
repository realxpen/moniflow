import Fastify from "fastify";

import { activityRoutes } from "./routes/activity.js";
import { bankingRoutes } from "./routes/banking.js";
import { healthRoutes } from "./routes/health.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { operatorRoutes } from "./routes/operator.js";
import { pocketRoutes } from "./routes/pockets.js";
import { walletRoutes } from "./routes/wallet.js";

export const buildApp = () => {
  const app = Fastify({
    logger: {
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "headers.authorization",
        "BMONI_API_KEY"
      ]
    }
  });

  app.register(healthRoutes);
  app.register(onboardingRoutes, { prefix: "/onboarding" });
  app.register(walletRoutes, { prefix: "/wallet" });
  app.register(bankingRoutes, { prefix: "/banking" });
  app.register(operatorRoutes, { prefix: "/operator" });
  app.register(activityRoutes, { prefix: "/activity" });
  app.register(pocketRoutes, { prefix: "/pockets" });

  return app;
};
