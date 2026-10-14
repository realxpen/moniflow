import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SqliteUserMappingRepository } from "../../repositories/sqlite-user-mapping.js";

import type { BmoniGateway } from "./gateway.js";
import { BmoniUserService, UserMappingConflictError, UserMappingReconciliationHoldError } from "./user-service.js";
import { BmoniProviderError, BmoniTransportError, BmoniResponseValidationError } from "./errors.js";

const repositories: SqliteUserMappingRepository[] = [];
const directories: string[]=[];
afterEach(async () => {
  await Promise.all(repositories.splice(0).map((repository) => repository.close()));
  directories.splice(0).forEach(dir=>rmSync(dir,{recursive:true,force:true}));
});

function createFixture() {
  const createUser = vi.fn<BmoniGateway["createUser"]>().mockResolvedValue({
    bmoniUserId: "bmoni-user-1",
    email: "ada@example.com",
    firstName: "Ada"
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

  return { createUser, gateway, repository, service: new BmoniUserService(gateway, repository) };
}

const input = {
  email: "ada@example.com",
  firstName: "Ada",
  localUserId: "11111111-1111-4111-8111-111111111111",
  phoneNumber: "+2348012345678"
};

describe("BmoniUserService", () => {
  it("creates and persists a provider mapping once with stable partner identity keys", async () => {
    const { createUser, service } = createFixture();

    await expect(service.createOrFindMapping(input)).resolves.toMatchObject({ bmoniUserId: "bmoni-user-1", status: "created" });
    await expect(service.createOrFindMapping(input)).resolves.toMatchObject({ bmoniUserId: "bmoni-user-1", status: "existing" });
    expect(createUser).toHaveBeenCalledTimes(1);
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({
      employeeId: "MF-11111111111141118111111111111111",
      identityId: "moniflow-11111111111141118111111111111111"
    }));
  });

  it("preserves explicitly supplied partner identity keys", async () => {
    const { createUser, service } = createFixture();
    await service.createOrFindMapping({ ...input, employeeId: "EMP-CUSTOM", identityId: "IDENTITY-CUSTOM" });
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ employeeId: "EMP-CUSTOM", identityId: "IDENTITY-CUSTOM" }));
  });

  it("persistently holds a provider 409 and never retries an already-created sandbox identity", async () => {
    const {createUser,service,repository}=createFixture();
    createUser.mockRejectedValueOnce(new BmoniProviderError(409,null,"first-409"));
    await expect(service.createOrFindMapping(input)).rejects.toBeInstanceOf(BmoniProviderError);
    const hold=await repository.findHoldByEmail("ADA@EXAMPLE.COM");
    expect(hold).toMatchObject({state:"PROVIDER_USER_EXISTS",localUserId:input.localUserId});
    await expect(service.createOrFindMapping(input))
      .rejects.toMatchObject({name:"UserMappingReconciliationHoldError",state:"PROVIDER_USER_EXISTS"});
    expect(createUser).toHaveBeenCalledTimes(1);
    await expect(service.createOrFindMapping({...input,localUserId:"22222222-2222-4222-8222-222222222222"}))
      .rejects.toBeInstanceOf(UserMappingConflictError);
    expect(createUser).toHaveBeenCalledTimes(1);
  });

  it("holds unknown provider transport and malformed response without blind retry", async () => {
    for(const failure of [
      new BmoniTransportError("Provider timeout",true),
      new BmoniResponseValidationError("unknown-provider-response")
    ]) {
      const {createUser,service,repository}=createFixture();
      createUser.mockRejectedValueOnce(failure);
      await expect(service.createOrFindMapping(input)).rejects.toBe(failure);
      expect((await repository.findHoldByEmail(input.email))?.state).toBe("PROVIDER_OUTCOME_UNKNOWN");
      await expect(service.createOrFindMapping(input))
        .rejects.toBeInstanceOf(UserMappingReconciliationHoldError);
      expect(createUser).toHaveBeenCalledTimes(1);
    }
  });

  it("holds an unexpected successful provider identity rather than retrying to repair it",async()=>{
    const {createUser,service,repository}=createFixture();
    createUser.mockResolvedValueOnce({
      bmoniUserId:"provider-other-identity",email:"someone-else@example.com",firstName:"Other"
    });
    await expect(service.createOrFindMapping(input)).rejects.toBeInstanceOf(UserMappingConflictError);
    expect((await repository.findHoldByEmail(input.email))?.state).toBe("PROVIDER_OUTCOME_UNKNOWN");
    await expect(service.createOrFindMapping(input))
      .rejects.toBeInstanceOf(UserMappingReconciliationHoldError);
    expect(createUser).toHaveBeenCalledTimes(1);
  });

  it("reopens the same held identity after a real SQLite restart without provider recreation", async () => {
    const dir=mkdtempSync(join(tmpdir(),"bmoni-reconcile-"));
    directories.push(dir);
    const databaseUrl="file:"+join(dir,"identity.db");
    const first=new SqliteUserMappingRepository(databaseUrl);
    const fixture=createFixture();
    const createUser=fixture.createUser;
    createUser.mockRejectedValueOnce(new BmoniProviderError(409,null,"r"));
    const service=new BmoniUserService(fixture.gateway,first);
    await expect(service.createOrFindMapping(input)).rejects.toBeInstanceOf(BmoniProviderError);
    await first.close();
    const reopened=new SqliteUserMappingRepository(databaseUrl);
    repositories.push(reopened);
    const restarted=new BmoniUserService(fixture.gateway,reopened);
    await expect(restarted.createOrFindMapping(input))
      .rejects.toMatchObject({state:"PROVIDER_USER_EXISTS"});
    expect(createUser).toHaveBeenCalledTimes(1);
    expect((await reopened.findHoldByEmail(input.email))?.localUserId).toBe(input.localUserId);
  });

  it("blocks an email from being attached to a second local identity", async () => {
    const { service } = createFixture();
    await service.createOrFindMapping(input);

    await expect(service.createOrFindMapping({ ...input, localUserId: "22222222-2222-4222-8222-222222222222" })).rejects.toBeInstanceOf(UserMappingConflictError);
  });
});
