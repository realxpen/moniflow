import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SqliteUserMappingRepository } from "../../repositories/sqlite-user-mapping.js";

import type { BmoniGateway } from "./gateway.js";
import { BmoniUserService, UserMappingConflictError, UserMappingReconciliationHoldError } from "./user-service.js";
import { BmoniProviderError, BmoniTransportError, BmoniResponseValidationError } from "./errors.js";
import { phoneIdentityFingerprint, phoneIdentityKeyGuard } from "./phone-identity-fingerprint.js";

const PHONE_KEY="moniflow-disposable-phone-test-key-at-least-32";

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

  return { createUser, gateway, repository, service: new BmoniUserService(gateway, repository, PHONE_KEY) };
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
    const service=new BmoniUserService(fixture.gateway,first,PHONE_KEY);
    await expect(service.createOrFindMapping(input)).rejects.toBeInstanceOf(BmoniProviderError);
    await first.close();
    const reopened=new SqliteUserMappingRepository(databaseUrl);
    repositories.push(reopened);
    const restarted=new BmoniUserService(fixture.gateway,reopened,PHONE_KEY);
    await expect(restarted.createOrFindMapping(input))
      .rejects.toMatchObject({state:"PROVIDER_USER_EXISTS"});
    expect(createUser).toHaveBeenCalledTimes(1);
    expect((await reopened.findHoldByEmail(input.email))?.localUserId).toBe(input.localUserId);
  });

  it("allows exactly one concurrent first-time provider request across two SQLite processes",async()=>{
    const dir=mkdtempSync(join(tmpdir(),"bmoni-atomic-"));
    directories.push(dir);
    const url="file:"+join(dir,"mapping.db");
    const repositoryA=new SqliteUserMappingRepository(url);
    const repositoryB=new SqliteUserMappingRepository(url);
    repositories.push(repositoryA,repositoryB);
    const fixture=createFixture();
    let release!:()=>void;
    const pending=new Promise<void>(resolve=>{release=resolve;});
    fixture.createUser.mockImplementation(async()=>{
      await pending;
      return {bmoniUserId:"bmoni-user-1",email:input.email,firstName:"Ada"};
    });
    const serviceA=new BmoniUserService(fixture.gateway,repositoryA,PHONE_KEY);
    const serviceB=new BmoniUserService(fixture.gateway,repositoryB,PHONE_KEY);
    const first=serviceA.createOrFindMapping(input);
    await vi.waitFor(()=>expect(fixture.createUser).toHaveBeenCalledTimes(1));
    await expect(serviceB.createOrFindMapping({...input,email:"ADA@example.com"}))
      .rejects.toBeInstanceOf(UserMappingReconciliationHoldError);
    expect(fixture.createUser).toHaveBeenCalledTimes(1);
    release();
    await expect(first).resolves.toMatchObject({status:"created",bmoniUserId:"bmoni-user-1"});
    expect(fixture.createUser).toHaveBeenCalledTimes(1);
    await expect(serviceB.createOrFindMapping(input)).resolves.toMatchObject({status:"existing"});
  });

  it("blocks different emails from claiming the same local identity concurrently",async()=>{
    const {createUser,service}=createFixture();
    let release!:()=>void;
    const pending=new Promise<void>(resolve=>{release=resolve;});
    createUser.mockImplementation(async()=>{
      await pending;
      return {bmoniUserId:"bmoni-user-1",email:input.email,firstName:"Ada"};
    });
    const first=service.createOrFindMapping(input);
    await vi.waitFor(()=>expect(createUser).toHaveBeenCalledTimes(1));
    await expect(service.createOrFindMapping({...input,email:"second@example.com"}))
      .rejects.toBeInstanceOf(UserMappingConflictError);
    expect(createUser).toHaveBeenCalledTimes(1);
    release();
    await first;
  });

  it("holds a crash-gap reservation even when the provider was never contacted",async()=>{
    const dir=mkdtempSync(join(tmpdir(),"bmoni-crash-gap-"));
    directories.push(dir);
    const url="file:"+join(dir,"mapping.db");
    const first=new SqliteUserMappingRepository(url);
    // Crash-gap test models a NEW reserved identity under a previously
    // enrolled valid key, not an unmarked pre-migration legacy database.
    await first.assertPhoneKeyContinuity(phoneIdentityKeyGuard(PHONE_KEY));
    expect(await first.reserveBeforeCreate({
      email:input.email,localUserId:input.localUserId,
      phoneFingerprint:phoneIdentityFingerprint(input.phoneNumber,PHONE_KEY),
      state:"PROVIDER_OUTCOME_UNKNOWN",createdAt:new Date().toISOString()
    })).toBe(true);
    await first.close();
    const restarted=new SqliteUserMappingRepository(url);
    repositories.push(restarted);
    const fixture=createFixture();
    const service=new BmoniUserService(fixture.gateway,restarted,PHONE_KEY);
    await expect(service.createOrFindMapping(input))
      .rejects.toMatchObject({state:"PROVIDER_OUTCOME_UNKNOWN"});
    expect(fixture.createUser).not.toHaveBeenCalled();
  });

  it("keeps pre-dispatch hold when provider returns a definite 400, requiring manual review",async()=>{
    const {createUser,repository,service}=createFixture();
    createUser.mockRejectedValueOnce(new BmoniProviderError(400,null,"invalid"));
    await expect(service.createOrFindMapping(input)).rejects.toBeInstanceOf(BmoniProviderError);
    expect((await repository.findHoldByEmail(input.email))?.state).toBe("PROVIDER_OUTCOME_UNKNOWN");
    await expect(service.createOrFindMapping(input))
      .rejects.toBeInstanceOf(UserMappingReconciliationHoldError);
    expect(createUser).toHaveBeenCalledTimes(1);
  });

  it("blocks different emails with the same E164 phone, even across independent SQLite connections",async()=>{
    const dir=mkdtempSync(join(tmpdir(),"bmoni-phone-collision-"));
    directories.push(dir);
    const dbUrl="file:"+join(dir,"identity.sqlite");
    const a=new SqliteUserMappingRepository(dbUrl);
    const b=new SqliteUserMappingRepository(dbUrl);
    repositories.push(a,b);
    const fixture=createFixture();
    let release!:()=>void;
    const pending=new Promise<void>(resolve=>{release=resolve;});
    fixture.createUser.mockImplementation(async()=>{
      await pending;
      return {bmoniUserId:"bmoni-user-1",email:input.email,firstName:"Ada"};
    });
    const first=new BmoniUserService(fixture.gateway,a,PHONE_KEY).createOrFindMapping(input);
    await vi.waitFor(()=>expect(fixture.createUser).toHaveBeenCalledTimes(1));
    await expect(new BmoniUserService(fixture.gateway,b,PHONE_KEY).createOrFindMapping({
      ...input,
      email:"another@example.com",
      localUserId:"22222222-2222-4222-8222-222222222222"
    })).rejects.toBeInstanceOf(UserMappingConflictError);
    expect(fixture.createUser).toHaveBeenCalledTimes(1);
    release();
    await expect(first).resolves.toMatchObject({status:"created"});
    const held=await b.findHoldByEmail(input.email);
    expect(held?.phoneFingerprint).toBe(phoneIdentityFingerprint(input.phoneNumber,PHONE_KEY));
    expect(JSON.stringify(held)).not.toContain(input.phoneNumber);
  });

  it("rejects a changed phone for a previously mapped email instead of handing out wallet identity",async()=>{
    const {service,createUser}=createFixture();
    await service.createOrFindMapping(input);
    await expect(service.createOrFindMapping({...input,phoneNumber:"+2348012345679"}))
      .rejects.toBeInstanceOf(UserMappingConflictError);
    expect(createUser).toHaveBeenCalledTimes(1);
  });

  it("blocks other emails with the same phone after a process restart",async()=>{
    const dir=mkdtempSync(join(tmpdir(),"bmoni-phone-restart-"));
    directories.push(dir);
    const url="file:"+join(dir,"mapping.sqlite");
    const repoA=new SqliteUserMappingRepository(url);
    const fixture=createFixture();
    const first=new BmoniUserService(fixture.gateway,repoA,PHONE_KEY);
    await first.createOrFindMapping(input);
    await repoA.close();
    const repoB=new SqliteUserMappingRepository(url);
    repositories.push(repoB);
    const second=new BmoniUserService(fixture.gateway,repoB,PHONE_KEY);
    await expect(second.createOrFindMapping({
      ...input,email:"other@example.com",
      localUserId:"33333333-3333-4333-8333-333333333333"
    })).rejects.toBeInstanceOf(UserMappingConflictError);
    expect(fixture.createUser).toHaveBeenCalledTimes(1);
  });

  it("requires a stable explicitly configured phone fingerprint secret before any new provider request",async()=>{
    const {gateway,repository,createUser}=createFixture();
    const service=new BmoniUserService(gateway,repository);
    await expect(service.createOrFindMapping(input)).rejects.toThrow(
      "BMONI_IDENTITY_PHONE_HMAC_SECRET"
    );
    expect(createUser).not.toHaveBeenCalled();
    expect(await repository.findHoldByEmail(input.email)).toBe(null);
  });

  it("rejects silent HMAC key rotation across SQLite restarts before any new provider call",async()=>{
    const dir=mkdtempSync(join(tmpdir(),"bmoni-key-guard-"));
    directories.push(dir);
    const url="file:"+join(dir,"mapping.db");
    const firstRepo=new SqliteUserMappingRepository(url);
    const fixture=createFixture();
    const first=new BmoniUserService(fixture.gateway,firstRepo,PHONE_KEY);
    await first.createOrFindMapping(input);
    await firstRepo.close();
    const reopened=new SqliteUserMappingRepository(url);
    repositories.push(reopened);
    const wrong=new BmoniUserService(fixture.gateway,reopened,PHONE_KEY+"rotated");
    await expect(wrong.createOrFindMapping(input))
      .rejects.toThrow("BMONI_PHONE_KEY_CONTINUITY_MISMATCH");
    await expect(wrong.createOrFindMapping({
      ...input,email:"unseen@example.com",
      localUserId:"99999999-9999-4999-8999-999999999999",
      phoneNumber:"+2348012345679"
    })).rejects.toThrow("BMONI_PHONE_KEY_CONTINUITY_MISMATCH");
    expect(fixture.createUser).toHaveBeenCalledTimes(1);
    const same=new BmoniUserService(fixture.gateway,reopened,PHONE_KEY);
    await expect(same.createOrFindMapping(input)).resolves.toMatchObject({
      status:"existing",bmoniUserId:"bmoni-user-1"
    });
  });

  it("serializes first-use key enrollment across independent SQLite instances",async()=>{
    const dir=mkdtempSync(join(tmpdir(),"bmoni-key-guard-instances-"));
    directories.push(dir);
    const url="file:"+join(dir,"mapping.db");
    const repoA=new SqliteUserMappingRepository(url);
    const repoB=new SqliteUserMappingRepository(url);
    repositories.push(repoA,repoB);
    const fixture=createFixture();
    await Promise.all([
      repoA.assertPhoneKeyContinuity(phoneIdentityKeyGuard(PHONE_KEY)),
      repoB.assertPhoneKeyContinuity(phoneIdentityKeyGuard(PHONE_KEY))
    ]);
    await expect(repoB.assertPhoneKeyContinuity(phoneIdentityKeyGuard(PHONE_KEY+"changed")))
      .rejects.toThrow("BMONI_PHONE_KEY_CONTINUITY_MISMATCH");
    expect(fixture.createUser).not.toHaveBeenCalled();
  });

  it("blocks an email from being attached to a second local identity", async () => {
    const { service } = createFixture();
    await service.createOrFindMapping(input);

    await expect(service.createOrFindMapping({ ...input, localUserId: "22222222-2222-4222-8222-222222222222" })).rejects.toBeInstanceOf(UserMappingConflictError);
  });
});
