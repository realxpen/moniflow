import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../app.js";
import { SqliteUserMappingRepository } from "../repositories/sqlite-user-mapping.js";
import type { BmoniGateway } from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function gatewayMethods(): Omit<BmoniGateway, "createUser" | "getSupportedSmartWalletCurrencies"> {
  return {
    approveProposal: vi.fn(),
    createManagedSmartWallet: vi.fn(),
    createOwnerProofChallenge: vi.fn(),
    getNgnDepositAccount: vi.fn(),
    getNigerianBanks: vi.fn(),
    getOnboardingStatus: vi.fn(),
    getProposal: vi.fn(),
    getProposalSignPayload: vi.fn(),
    getSmartWallet: vi.fn(),
    listAccountBalances: vi.fn(),
    listAccountWallets: vi.fn(),
    lookupBvn: vi.fn(),
    offrampNigeria: vi.fn(),
    registerNigerianWithdrawalAccount: vi.fn(),
    signProposal: vi.fn(),
    startNigeriaOnboarding: vi.fn(),
    updateNigeriaKyc: vi.fn(),
    verifyNigerianAccount: vi.fn()
  };
}

describe("GET /health", () => {
  it("reports the API service and environment", async () => {
    const app = buildApp();
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", service: "moniflow-api", environment: "test" });
  });

  it("checks BMONI connectivity without returning credentials", async () => {
    const gateway: BmoniGateway = {
      createUser: vi.fn(),
      getSupportedSmartWalletCurrencies: vi.fn().mockResolvedValue({ currencies: ["CNGN", "USDB"] }),
      ...gatewayMethods()
    };
    const repository = new SqliteUserMappingRepository(":memory:");
    const app = buildApp({
      getBmoniGateway: () => gateway,
      getBmoniUserService: () => new BmoniUserService(gateway, repository)
    });
    app.addHook("onClose", async () => repository.close());
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/health/bmoni" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ currencies: ["CNGN", "USDB"], environment: "sandbox", service: "bmoni", status: "ok" });
    expect(response.body).not.toContain("x-api-key");
  });
});
