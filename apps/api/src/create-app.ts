import multipart from "@fastify/multipart";
import Fastify from "fastify";

import { attachBrowserCors } from "./config/browser-cors.js";

import { env } from "./config/env.js";
import type { ActivityRepository } from "./repositories/activity.js";
import type { BankAccountRepository } from "./repositories/bank-account.js";
import type { ExecutionRepository } from "./repositories/execution.js";
import { createRepositories, type RepositorySet } from "./repositories/index.js";
import type { MoneyPlanRepository } from "./repositories/money-plan.js";
import type { PocketRepository } from "./repositories/pocket.js";
import type { WalletOwnershipRepository } from "./repositories/wallet-ownership.js";
import { activityRoutes } from "./routes/activity.js";
import { bankingRoutes } from "./routes/banking.js";
import { devBootstrapRoutes } from "./routes/dev-bootstrap.js";
import { devRoutes } from "./routes/dev.js";
import { executionFinalizationRoutes } from "./routes/execution-finalization.js";
import { executionRoutes } from "./routes/execution.js";
import { healthRoutes } from "./routes/health.js";
import { nigeriaOnboardingRoutes } from "./routes/nigeria-onboarding.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { operatorRoutes } from "./routes/operator.js";
import { pocketRoutes } from "./routes/pockets.js";
import { partnerRoutes } from "./routes/partner.js";
import { SqlitePartnerOperationStore } from "./services/partner/sqlite-store.js";
import { PostgresPartnerOperationStore } from "./services/partner/postgres-store.js";
import { walletFundingRoutes } from "./routes/wallet-funding.js";
import { walletRoutes } from "./routes/wallet.js";
import { walletOwnershipRoutes } from "./routes/wallet-ownership.js";
import type { BmoniGateway } from "./services/bmoni/index.js";
import { BmoniUserService } from "./services/bmoni/user-service.js";
import { createFinancialProvider } from "./services/financial-provider/index.js";

export type AppDependencies = {
  getBmoniGateway: () => BmoniGateway;
  getBmoniUserService: () => BmoniUserService;
  getWalletOwnershipRepository?: () => WalletOwnershipRepository;
  getMoneyPlanRepository?: () => MoneyPlanRepository;
  getBankAccountRepository?: () => BankAccountRepository;
  getExecutionRepository?: () => ExecutionRepository;
  getPocketRepository?: () => PocketRepository;
  getActivityRepository?: () => ActivityRepository;
  ready?: Promise<void>;
};

function createRuntimeDependencies() {
  let gateway: BmoniGateway | undefined;
  let repositories: RepositorySet | undefined;
  let userService: BmoniUserService | undefined;
  const getRepositories = () => (repositories ??= createRepositories(env.DATABASE_URL));
  const getBmoniGateway = () => (gateway ??= createFinancialProvider());

  return {
    dependencies: {
      getBmoniGateway,
      getBmoniUserService: () => (userService ??= new BmoniUserService(getBmoniGateway(), getRepositories().users)),
      getWalletOwnershipRepository: () => getRepositories().wallets,
      getMoneyPlanRepository: () => getRepositories().plans,
      getBankAccountRepository: () => getRepositories().banks,
      getExecutionRepository: () => getRepositories().executions,
      getPocketRepository: () => getRepositories().pockets,
      getActivityRepository: () => getRepositories().activities,
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
    !dependencyOverrides.getExecutionRepository ||
    !dependencyOverrides.getPocketRepository ||
    !dependencyOverrides.getActivityRepository
  ) ? createRepositories(":memory:") : null;

  const getWalletOwnershipRepository = dependencies.getWalletOwnershipRepository ?? (() => testRepositories!.wallets);
  const getMoneyPlanRepository = dependencies.getMoneyPlanRepository ?? (() => testRepositories!.plans);
  const getBankAccountRepository = dependencies.getBankAccountRepository ?? (() => testRepositories!.banks);
  const getExecutionRepository = dependencies.getExecutionRepository ?? (() => testRepositories!.executions);
  const getPocketRepository = dependencies.getPocketRepository ?? (() => testRepositories!.pockets);
  const getActivityRepository = dependencies.getActivityRepository ?? (() => testRepositories!.activities);

  // Partner sandbox is opt-in, unavailable in production and deliberately
  // cannot run when the configured financial provider is BMONI.
  const partnerEnabled =
    env.NODE_ENV !== "production" &&
    env.FINANCIAL_PROVIDER === "moniflow-sandbox" &&
    env.PARTNER_HUSTLE_SANDBOX_ENABLED === "true";
  if (partnerEnabled && !env.PARTNER_HUSTLE_HMAC_SECRET) {
    throw new Error("PARTNER_HUSTLE_HMAC_SECRET required for sandbox partner API");
  }
  const partnerStore = partnerEnabled
    ? env.DATABASE_URL.startsWith("postgres")
      ? new PostgresPartnerOperationStore(env.DATABASE_URL)
      : new SqlitePartnerOperationStore(env.DATABASE_URL)
    : null;

  const app = Fastify({
    logger: {
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers.x-api-key",
        "headers.authorization",
        "req.headers.x-moniflow-signature",
        "headers.x-moniflow-signature",
        "req.headers.x-moniflow-nonce",
        "headers.x-moniflow-nonce",
        "headers.x-api-key",
        "BMONI_API_KEY",
        "req.body.signature",
        "req.body.ownerProofSignature",
        "req.body.bvn",
        "req.body.accountNumber"
      ]
    }
  });
  // Allow requests only from our published website and explicitly configured development origins.
  // Native apps and server-to-server requests do not need browser CORS headers.
  attachBrowserCors(app, env.CORS_ALLOWED_ORIGINS);
  app.register(multipart, { limits: { fields: 12, files: 4, fileSize: 8 * 1024 * 1024, parts: 16 } });
  if (testRepositories) app.addHook("onClose", async () => testRepositories.close());
  if (partnerStore) {
    app.register(partnerRoutes, { prefix: "/internal/v1", store: partnerStore, secret: env.PARTNER_HUSTLE_HMAC_SECRET! });
    app.addHook("onClose", async () => partnerStore.close());
  }

  const operatorOptions = {
    getBmoniGateway: dependencies.getBmoniGateway,
    getBmoniUserService: dependencies.getBmoniUserService,
    getMoneyPlanRepository,
    getBankAccountRepository,
    getPocketRepository
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
  const devBootstrapOptions = {
    ...walletOptions,
    getBankAccountRepository
  };
  const executionOptions = {
    ...operatorOptions,
    getWalletOwnershipRepository,
    getExecutionRepository
  };
  const finalizationOptions = {
    getBmoniGateway: dependencies.getBmoniGateway,
    getBmoniUserService: dependencies.getBmoniUserService,
    getMoneyPlanRepository,
    getExecutionRepository,
    getPocketRepository,
    getActivityRepository
  };

  app.register(healthRoutes, { getBmoniGateway: dependencies.getBmoniGateway });
  app.register(onboardingRoutes, { prefix: "/api/onboarding", getBmoniUserService: dependencies.getBmoniUserService });
  app.register(nigeriaOnboardingRoutes, { prefix: "/api/onboarding/nigeria", ...walletOptions });
  app.register(devRoutes, { prefix: "/api/dev", ...walletOptions });
  app.register(devBootstrapRoutes, { prefix: "/api/dev", ...devBootstrapOptions });
  app.register(walletOwnershipRoutes, { prefix: "/api/wallet", ...walletOptions });
  app.register(walletRoutes, { prefix: "/api/wallet", ...walletOptions, getPocketRepository });
  app.register(walletFundingRoutes, { prefix: "/api/wallet", ...walletOptions });
  app.register(bankingRoutes, { prefix: "/api/banks", ...bankingOptions });
  app.register(operatorRoutes, { prefix: "/api/operator", ...operatorOptions });
  app.register(executionRoutes, { prefix: "/api/operator", ...executionOptions });
  app.register(executionFinalizationRoutes, { prefix: "/api/operator", ...finalizationOptions });
  app.register(pocketRoutes, { prefix: "/api/pockets", getPocketRepository });
  app.register(activityRoutes, { prefix: "/api/activity", getActivityRepository });

  app.register(onboardingRoutes, { prefix: "/onboarding", getBmoniUserService: dependencies.getBmoniUserService });
  app.register(bankingRoutes, { prefix: "/banking", ...bankingOptions });
  app.register(operatorRoutes, { prefix: "/operator", ...operatorOptions });
  app.register(executionRoutes, { prefix: "/operator", ...executionOptions });
  app.register(executionFinalizationRoutes, { prefix: "/operator", ...finalizationOptions });
  app.register(activityRoutes, { prefix: "/activity", getActivityRepository });
  app.register(pocketRoutes, { prefix: "/pockets", getPocketRepository });

  if (runtime) app.addHook("onClose", async () => runtime.close());
  return app;
};
