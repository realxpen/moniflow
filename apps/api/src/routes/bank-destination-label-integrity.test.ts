import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../create-app.js";
import { BankDestinationLabelConflictError, type VerifiedBankAccount } from "../repositories/bank-account.js";
import { SqliteBankAccountRepository } from "../repositories/sqlite-bank-account.js";
import type { BmoniGateway } from "../services/bmoni/index.js";
import type { BmoniUserService } from "../services/bmoni/user-service.js";

const user = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const apps: Array<ReturnType<typeof buildApp>> = [];
const repos: SqliteBankAccountRepository[] = [];
const now = () => new Date().toISOString();

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  await Promise.all(repos.splice(0).map((repo) => repo.close()));
});

function fixture(changes: Partial<VerifiedBankAccount> = {}): VerifiedBankAccount {
  return {
    id: randomUUID(),
    localUserId: user,
    label: "GTBank",
    providerAccountId: "provider-bank-001",
    bankCode: "058",
    bankName: "GTBank",
    maskedAccountNumber: "•••• 1234",
    accountHolderName: "EXAMPLE HOLDER",
    verified: true,
    createdAt: now(),
    updatedAt: now(),
    ...changes
  };
}

function repository() {
  const bank = new SqliteBankAccountRepository(":memory:");
  repos.push(bank);
  return bank;
}

describe("Phase 34D immutable verified bank labels", () => {
  it("replays identical verified destination idempotently without changing immutable stored fields", async () => {
    const bank = repository();
    const first = fixture();
    const saved = await bank.saveVerified(first);
    const retry = await bank.saveVerified({ ...first, id: randomUUID(), updatedAt: now() });
    expect(retry.id).toBe(saved.id);
    expect(retry.providerAccountId).toBe("provider-bank-001");
    expect(await bank.findVerifiedByLabel(user, "GT BANK")).toEqual(saved);
  });

  it("refuses a same-label replacement to a different verified provider account", async () => {
    const bank = repository();
    const first = await bank.saveVerified(fixture());
    await expect(bank.saveVerified(fixture({ label: "GT BANK", providerAccountId: "provider-bank-attacker" })))
      .rejects.toBeInstanceOf(BankDestinationLabelConflictError);
    const unchanged = await bank.findVerifiedByLabel(user, "gtbank");
    expect(unchanged).toEqual(first);
  });

  it("also refuses changing identity data behind the same provider id and label", async () => {
    const bank = repository();
    const first = await bank.saveVerified(fixture());
    for (const candidate of [
      { bankCode: "044" }, { bankName: "Access Bank" },
      { maskedAccountNumber: "•••• 9876" }, { accountHolderName: "OTHER PERSON" }
    ]) {
      await expect(bank.saveVerified(fixture(candidate))).rejects.toMatchObject({
        code: "BANK_DESTINATION_LABEL_CONFLICT"
      });
    }
    expect(await bank.findVerifiedByLabel(user, "GTBank")).toEqual(first);
  });

  it("does not allow the same provider account to acquire another alias while preserving the original", async () => {
    const bank = repository();
    const first = await bank.saveVerified(fixture());
    await expect(bank.saveVerified(fixture({ label: "NewAlias" })))
      .rejects.toMatchObject({ code: "BANK_DESTINATION_LABEL_CONFLICT" });
    expect(await bank.findVerifiedByLabel(user, "GTBank")).toEqual(first);
    expect(await bank.findVerifiedByLabel(user, "NewAlias")).toBeNull();
  });

  it("isolates distinct users and permits genuinely new verified destinations", async () => {
    const bank = repository();
    await bank.saveVerified(fixture());
    const second = fixture({ localUserId: other, label: "GTBank", providerAccountId: "provider-bank-002" });
    expect((await bank.saveVerified(second)).localUserId).toBe(other);
    const third = fixture({ label: "AccessBank", providerAccountId: "provider-bank-003", bankCode: "044", bankName: "Access Bank" });
    expect((await bank.saveVerified(third)).providerAccountId).toBe("provider-bank-003");
    expect((await bank.findVerifiedByLabel(user, "GTBank"))?.providerAccountId).toBe("provider-bank-001");
  });

  it("preflights a duplicate label before ANY provider account verification or registration", async () => {
    const bank = repository();
    const first = await bank.saveVerified(fixture());
    const verifyNigerianAccount = vi.fn();
    const registerNigerianWithdrawalAccount = vi.fn();
    const service = { getMapping: vi.fn().mockResolvedValue({ bmoniUserId: "fixture-bmoni-id" }) } as unknown as BmoniUserService;
    const app = buildApp({
      getBmoniGateway: () => ({
        verifyNigerianAccount, registerNigerianWithdrawalAccount
      } as unknown as BmoniGateway),
      getBmoniUserService: () => service,
      getBankAccountRepository: () => bank
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST", url: "/api/banks/register",
      payload: {
        localUserId: user, label: "GT BANK", bankCode: "044",
        bankName: "Access Bank", accountNumber: "0123456789",
        accountHolderName: "OTHER PERSON"
      }
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("BANK_DESTINATION_LABEL_CONFLICT");
    expect(verifyNigerianAccount).not.toHaveBeenCalled();
    expect(registerNigerianWithdrawalAccount).not.toHaveBeenCalled();
    expect(await bank.findVerifiedByLabel(user, "GTBank")).toEqual(first);
  });

  it("returns HTTP 409 on a repository race without modifying an existing bank label", async () => {
    const bank = repository();
    const first = await bank.saveVerified(fixture());
    const verifyNigerianAccount = vi.fn().mockResolvedValue({ accountHolderName: "OTHER PERSON" });
    const registerNigerianWithdrawalAccount = vi.fn().mockResolvedValue({ id: "provider-bank-attacker" });
    const findVerifiedByLabel = vi.fn()
      .mockResolvedValueOnce(null)
      .mockImplementation((id: string, label: string) => bank.findVerifiedByLabel(id, label));
    const racingRepo = {
      findVerifiedByLabel,
      saveVerified: (...args: Parameters<SqliteBankAccountRepository["saveVerified"]>) => bank.saveVerified(...args)
    };
    const service = { getMapping: vi.fn().mockResolvedValue({ bmoniUserId: "fixture-bmoni-id" }) } as unknown as BmoniUserService;
    const app = buildApp({
      getBmoniGateway: () => ({
        verifyNigerianAccount, registerNigerianWithdrawalAccount
      } as unknown as BmoniGateway),
      getBmoniUserService: () => service,
      getBankAccountRepository: () => racingRepo as unknown as SqliteBankAccountRepository
    });
    apps.push(app);
    const response = await app.inject({
      method: "POST", url: "/api/banks/register",
      payload: {
        localUserId: user, label: "GTBank", bankCode: "044", bankName: "Access Bank",
        accountNumber: "0123456789", accountHolderName: "OTHER PERSON"
      }
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("BANK_DESTINATION_LABEL_CONFLICT");
    expect(registerNigerianWithdrawalAccount).toHaveBeenCalledTimes(1);
    expect(await bank.findVerifiedByLabel(user, "GTBank")).toEqual(first);
  });
});
