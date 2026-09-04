import Fastify from "fastify";

import { env } from "./config/env.js";
import { createRepositories, type RepositorySet } from "./repositories/index.js";
import type { WalletOwnershipRepository } from "./repositories/wallet-ownership.js";
import { activityRoutes } from "./routes/activity.js";
import { bankingRoutes } from "./routes/banking.js";
import { devRoutes } from "./routes/dev.js";
import { healthRoutes } from "./routes/health.js";
import { nigeriaOnboardingRoutes } from "./routes/nigeria-onboarding.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { operatorRoutes } from "./routes/operator.js";
import { pocketRoutes } from "./routes/pockets.js";
import { walletRoutes } from "./routes/wallet.js";
import { walletOwnershipRoutes } from "./routes/wallet-ownership.js";
import { createBmoniGateway, type BmoniGateway } from "./services/bmoni/index.js";
import { BmoniUserService } from "./services/bmoni/user-service.js";

export type AppDependencies = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
  getWalletOwnershipRepository: () => WalletOwnershipRepository;
  ready?: Promise<void>;
};

function createRuntimeDependencies() {
  let gateway: BmoniGateway | undefined;
  let repositories: RepositorySet | undefined;
  let userService: BmoniUserService | undefined;

  const getRepositories = () => (repositories ??= createRepositories(env.DATABASE_URL));
  const getBmoniGateway = () => (gateway ??= createBmoniGateway());

  return {
    dependencies: {
      getBmoniGateway,
      getBmoniUserService: () => (userService ??= new BmoniUserService(getBmoniGateway(), getRepositories().users)),
      getWalletOwnershipRepository: () => getRepositories().wallets,
      get ready() { return getRepositories().ready; }
    } satisfies AppDependencies,
    async close() { await repositories?.close(); }
  };
}

export const buildApp = (dependencyOverrides?: AppDependencies) => {
  const runtime = dependencyOverrides ? null : createRuntimeDependencies();
  const dependencies = dependencyOverrides ?? runtime?.dependencies;
  if (!dependencies) throw new Error("MONIFlow API dependencies could not be initialized.");

  const app = Fastify({
    logger: {
      redact: [
        "req.headers.authorization", "req.headers.cookie", "req.headers.x-api-key",
        "headers.authorization", "headers.x-api-key", "BMONI_API_KEY",
        "req.body.signature", "req.body.ownerProofSignature", "req.body.bvn"
      ]
    }
  });

  if (dependencies.ready) app.addHook("onReady", async () => dependencies.ready);

  const operatorOptions = {
    getBmoniGateway: dependencies.getBmoniGateway,
    getBmoniUserService: dependencies.getBmoniUserService
  };
  const walletOptions = {
    ...operatorOptions,
    getWalletOwnershipRepository: dependencies.getWalletOwnershipRepository
  };

  app.register(healthRoutes, { getBmoniGateway: dependencies.getBmoniGateway });
  app.register(onboardingRoutes, { prefix: "/api/onboarding", getBmoniUserService: dependencies.getBmoniUserService });
  app.register(nigeriaOnboardingRoutes, { prefix: "/api/onboarding/nigeria", ...walletOptions });
  app.register(devRoutes, { prefix: "/api/dev", ...walletOptions });
  app.register(walletOwnershipRoutes, { prefix: "/api/wallet", ...walletOptions });
  app.register(walletRoutes, { prefix: "/api/wallet", ...walletOptions });
  app.register(operatorRoutes, { prefix: "/api/operator", ...operatorOptions });

  app.register(onboardingRoutes, { prefix: "/onboarding", getBmoniUserService: dependencies.getBmoniUserService });
  app.register(bankingRoutes, { prefix: "/banking" });
  app.register(operatorRoutes, { prefix: "/operator", ...operatorOptions });
  app.register(activityRoutes, { prefix: "/activity" });
  app.register(pocketRoutes, { prefix: "/pockets" });

  if (runtime) app.addHook("onClose", async () => runtime.close());
  return app;
};
