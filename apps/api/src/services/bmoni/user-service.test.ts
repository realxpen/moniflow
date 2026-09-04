import { afterEach, describe, expect, it, vi } from "vitest";

import { SqliteUserMappingRepository } from "../../repositories/sqlite-user-mapping.js";

import type { BmoniGateway } from "./gateway.js";
import { BmoniUserService, UserMappingConflictError } from "./user-service.js";

const repositories: SqliteUserMappingRepository[] = [];

afterEach(async () => {
  await Promise.all(repositories.splice(0).map((repository) => repository.close()));
});

function createFixture() {
  const createUser = vi.fn<BmoniGateway["createUser"]>().mockResolvedValue({
    bmoniUserId: "bmoni-user-1",
    createdAt: "2026-09-03T12:00:00.000Z",
    email: "ada@example.com",
    firstName: "Ada",
    id: "provider-row-1",
    updatedAt: "2026-09-03T12:00:00.000Z"
  });
  const gateway: BmoniGateway = {
    activateKyc: vi.fn(),
    approveProposal: vi.fn(),
    createUser,
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
    getSupportedSmartWalletCurrencies: vi.fn(),
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
  const repository = new SqliteUserMappingRepository(":memory:");
  repositories.push(repository);

  return { createUser, service: new BmoniUserService(gateway, repository) };
}

const input = {
  email: "ada@example.com",
  firstName: "Ada",
  localUserId: "11111111-1111-4111-8111-111111111111",
  phoneNumber: "+2348012345678"
};

describe("BmoniUserService", () => {
  it("creates and persists a provider mapping once", async () => {
    const { createUser, service } = createFixture();

    await expect(service.createOrFindMapping(input)).resolves.toMatchObject({ bmoniUserId: "bmoni-user-1", status: "created" });
    await expect(service.createOrFindMapping(input)).resolves.toMatchObject({ bmoniUserId: "bmoni-user-1", status: "existing" });
    expect(createUser).toHaveBeenCalledTimes(1);
  });

  it("blocks an email from being attached to a second local identity", async () => {
    const { service } = createFixture();
    await service.createOrFindMapping(input);

    await expect(service.createOrFindMapping({ ...input, localUserId: "22222222-2222-4222-8222-222222222222" })).rejects.toBeInstanceOf(UserMappingConflictError);
  });
});
