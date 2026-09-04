import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../app.js";
import { SqliteUserMappingRepository } from "../repositories/sqlite-user-mapping.js";
import type { BmoniGateway } from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function additionalGatewayMethods(): Omit<BmoniGateway, "createUser" | "getSupportedSmartWalletCurrencies"> {
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

describe("POST /api/onboarding/user", () => {
  it("returns only the persisted identity mapping", async () => {
    const gateway: BmoniGateway = {
      createUser: vi.fn().mockResolvedValue({
        bmoniUserId: "bmoni-user-1",
        createdAt: "2026-09-03T12:00:00.000Z",
        email: "ada@example.com",
        firstName: "Ada",
        id: "provider-row-1",
        updatedAt: "2026-09-03T12:00:00.000Z"
      }),
      getSupportedSmartWalletCurrencies: vi.fn(),
      ...additionalGatewayMethods()
    };
    const repository = new SqliteUserMappingRepository(":memory:");
    const service = new BmoniUserService(gateway, repository);
    const app = buildApp({ getBmoniGateway: () => gateway, getBmoniUserService: () => service });
    app.addHook("onClose", async () => repository.close());
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      payload: {
        email: "ada@example.com",
        firstName: "Ada",
        localUserId: "11111111-1111-4111-8111-111111111111",
        phoneNumber: "+2348012345678"
      },
      url: "/api/onboarding/user"
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      bmoniUserId: "bmoni-user-1",
      localUserId: "11111111-1111-4111-8111-111111111111",
      status: "created"
    });
  });

  it("rejects invalid input before contacting BMONI", async () => {
    const gateway: BmoniGateway = {
      createUser: vi.fn(),
      getSupportedSmartWalletCurrencies: vi.fn(),
      ...additionalGatewayMethods()
    };
    const repository = new SqliteUserMappingRepository(":memory:");
    const app = buildApp({
      getBmoniGateway: () => gateway,
      getBmoniUserService: () => new BmoniUserService(gateway, repository)
    });
    app.addHook("onClose", async () => repository.close());
    apps.push(app);

    const response = await app.inject({ method: "POST", payload: { email: "not-an-email" }, url: "/api/onboarding/user" });

    expect(response.statusCode).toBe(400);
    expect(gateway.createUser).not.toHaveBeenCalled();
  });
});
