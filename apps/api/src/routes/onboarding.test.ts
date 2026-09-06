import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../create-app.js";
import { SqliteUserMappingRepository } from "../repositories/sqlite-user-mapping.js";
import { BmoniProviderError, type BmoniGateway } from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function additionalGatewayMethods(): Omit<BmoniGateway, "createUser" | "getSupportedSmartWalletCurrencies"> {
  return {
    activateKyc: vi.fn(),
    approveProposal: vi.fn(),
    createManagedSmartWallet: vi.fn(),
    createNgnVirtualAccount: vi.fn(),
    createOwnerProofChallenge: vi.fn(),
    getKycReadiness: vi.fn(),
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
    uploadKycIdentification: vi.fn(),
    uploadKycProofOfAddress: vi.fn(),
    verifyNigerianAccount: vi.fn()
  };
}

function createAppWithGateway(gateway: BmoniGateway) {
  const repository = new SqliteUserMappingRepository(":memory:");
  const service = new BmoniUserService(gateway, repository);
  const app = buildApp({ getBmoniGateway: () => gateway, getBmoniUserService: () => service });
  app.addHook("onClose", async () => repository.close());
  apps.push(app);
  return app;
}

describe("POST /api/onboarding/user", () => {
  it("returns the persisted identity mapping with an explicit created state", async () => {
    const gateway: BmoniGateway = {
      createUser: vi.fn().mockResolvedValue({
        bmoniUserId: "bmoni-user-1",
        email: "ada@example.com",
        firstName: "Ada"
      }),
      getSupportedSmartWalletCurrencies: vi.fn(),
      ...additionalGatewayMethods()
    };
    const app = createAppWithGateway(gateway);

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
      status: "created",
      provisioningState: "CREATED"
    });
  });

  it("returns the existing local mapping instead of creating a duplicate", async () => {
    const createUser = vi.fn().mockResolvedValue({ bmoniUserId: "bmoni-user-1", email: "ada@example.com", firstName: "Ada" });
    const gateway: BmoniGateway = { createUser, getSupportedSmartWalletCurrencies: vi.fn(), ...additionalGatewayMethods() };
    const app = createAppWithGateway(gateway);
    const request = {
      method: "POST" as const,
      payload: { email: "ada@example.com", firstName: "Ada", localUserId: "11111111-1111-4111-8111-111111111111", phoneNumber: "+2348012345678" },
      url: "/api/onboarding/user"
    };

    expect((await app.inject(request)).statusCode).toBe(201);
    const second = await app.inject(request);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toMatchObject({ provisioningState: "EXISTING_LOCAL_MAPPING", status: "existing" });
    expect(createUser).toHaveBeenCalledTimes(1);
  });

  it("surfaces provider conflicts as non-retryable reconciliation", async () => {
    const createUser = vi.fn().mockRejectedValue(new BmoniProviderError(409, null, "req-409"));
    const gateway: BmoniGateway = { createUser, getSupportedSmartWalletCurrencies: vi.fn(), ...additionalGatewayMethods() };
    const app = createAppWithGateway(gateway);

    const response = await app.inject({
      method: "POST",
      payload: { email: "unique@example.com", firstName: "Ada", phoneNumber: "+2348012345678" },
      url: "/api/onboarding/user"
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ provisioningState: "RECONCILIATION_REQUIRED", retryable: false });
    expect(createUser).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid input before contacting BMONI", async () => {
    const gateway: BmoniGateway = {
      createUser: vi.fn(),
      getSupportedSmartWalletCurrencies: vi.fn(),
      ...additionalGatewayMethods()
    };
    const app = createAppWithGateway(gateway);

    const response = await app.inject({ method: "POST", payload: { email: "not-an-email" }, url: "/api/onboarding/user" });

    expect(response.statusCode).toBe(400);
    expect(gateway.createUser).not.toHaveBeenCalled();
  });
});
