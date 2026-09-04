import multipart from "@fastify/multipart";
import Fastify from "fastify";

import { env } from "./config/env.js";
import { createRepositories, type RepositorySet } from "./repositories/index.js";
import type { BankAccountRepository } from "./repositories/bank-account.js";
import type { ExecutionRepository } from "./repositories/execution.js";
import type { MoneyPlanRepository } from "./repositories/money-plan.js";
import type { WalletOwnershipRepository } from "./repositories/wallet-ownership.js";
import { activityRoutes } from "./routes/activity.js";
import { bankingRoutes } from "./routes/banking.js";
import { devRoutes } from "./routes/dev.js";
import { executionRoutes } from "./routes/execution.js";
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
  getWalletOwnershipRepository?: () => WalletOwnershipRepository;
  getMoneyPlanRepository?: () => MoneyPlanRepository;
  getBankAccountRepository?: () => BankAccountRepository;
  getExecutionRepository?: () => ExecutionRepository;
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
      getMoneyPlanRepository: () => getRepositories().plans,
      getBankAccountRepository: () => getRepositories().banks,
      getExecutionRepository: () => getRepositories().executions,
      get ready() { return getRepositories().ready; }
    } satisfies AppDependencies,
    async close() { await repositories?.close(); }
  };
}

export const buildApp = (dependencyOverrides?: AppDependencies) => {
  const runtime = dependencyOverrides ? null : createRuntimeDependencies();
  const dependencies = dependencyOverrides ?? runtime?.dependencies;
  if (!dependencies) throw new Error("MONIFlow API dependencies could not be initialized.");

  const testRepositories = dependencyOverrides && (
    !dependencyOverrides.getWalletOwnershipRepository ||
    !dependencyOverrides.getMoneyPlanRepository ||
    !dependencyOverrides.getBankAccountRepository ||
    !dependencyOverrides.getExecutionRepository
  ) ? createRepositories(":memory:") : null;

  const getWalletOwnershipRepository = dependencies.getWalletOwnershipRepository ?? (() => testRepositories!.wallets);
  const getMoneyPlanRepository = dependencies.getMoneyPlanRepository ?? (() => testRepositories!.plans);
  const getBankAccountRepository = dependencies.getBankAccountRepository ?? (() => testRepositories!.banks);
  const getExecutionRepository = dependencies.getExecutionRepository ?? (() => testRepositories!.executions);

  const app = Fastify({
    logger: {
      redact: [
        "req.headers.authorization", "req.headers.cookie", "req.headers.x-api-key",
        "headers.authorization", "headers.x-api-key", "BMONI_API_KEY",
        "req.body.signature", "req.body.ownerProofSignature", "req.body.bvn", "req.body.accountNumber"
      ]
    }
  });

  // KYC uploads are bounded before any bytes are forwarded to BMONI.
  app.register(multipart, {
    limits: {
      fields: 12,
      files: 4,
      fileSize: 8 * 1024 * 1024,
      parts: 16
    }
  });

  if (dependencies.ready) app.addHook("onReady", async () => dependencies.ready);
  if (testRepositories) app.addHook("onClose", async () => testRepositories.close());

  const operatorOptions = {
    getBmoniGateway: dependencies.getBmoniGateway,
    getBmoniUserService: dependencies.getBmoniUserService,
    getMoneyPlanRepository,
    getBankAccountRepository
  };
  const walletOptions = {
    getBmoniGateway: dependencies.getBmoniGateway,
    getBmoniUserService: dependencies.getBmoniUserService,
    getWalletOwnershipRepository
  };
  const bankingOptions = {
    getBmoniGateway: dependencies.getBmoniGateway,
    getBmoniUserService: dependencies.getBmoniUserService,
    getBankAccountRepository
  };
  const executionOptions = {
    ...operatorOptions,
    getWalletOwnershipRepository,
    getExecutionRepository
  };

  app.register(healthRoutes, { getBmoniGateway: dependencies.getBmoniGateway });
  app.register(onboardingRoutes, { prefix: "/api/onboarding", getBmoniUserService: dependencies.getBmoniUserService });
  app.register(nigeriaOnboardingRoutes, { prefix: "/api/onboarding/nigeria", ...walletOptions });
  app.register(devRoutes, { prefix: "/api/dev", ...walletOptions });
  app.register(walletOwnershipRoutes, { prefix: "/api/wallet", ...walletOptions });
  app.register(walletRoutes, { prefix: "/api/wallet", ...walletOptions });
  app.register(bankingRoutes, { prefix: "/api/banks", ...bankingOptions });
  app.register(operatorRoutes, { prefix: "/api/operator", ...operatorOptions });
  app.register(executionRoutes, { prefix: "/api/operator", ...executionOptions });

  app.register(onboardingRoutes, { prefix: "/onboarding", getBmoniUserService: dependencies.getBmoniUserService });
  app.register(bankingRoutes, { prefix: "/banking", ...bankingOptions });
  app.register(operatorRoutes, { prefix: "/operator", ...operatorOptions });
  app.register(executionRoutes, { prefix: "/operator", ...executionOptions });
  app.register(activityRoutes, { prefix: "/activity" });
  app.register(pocketRoutes, { prefix: "/pockets" });

  if (runtime) app.addHook("onClose", async () => runtime.close());
  return app;
};
