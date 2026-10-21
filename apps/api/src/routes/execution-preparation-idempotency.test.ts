import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../create-app.js";
import { createRepositories, type RepositorySet } from "../repositories/index.js";
import type { BmoniGateway } from "../services/bmoni/index.js";
import type { BmoniUserService } from "../services/bmoni/user-service.js";
import { buildMoneyPlan } from "../services/plans/engine.js";
import { bindVerifiedPlanDestinations } from "../services/plans/beneficiary-binding.js";
import { fingerprintMoneyPlan } from "../services/plans/approval.js";

const userId = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const apps: Array<ReturnType<typeof buildApp>> = [];
const repos: RepositorySet[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map(x => x.close()));
  await Promise.all(repos.splice(0).map(x => x.close()));
});

function gate<T>() {
  let release!: (value: T) => void;
  const promise = new Promise<T>(resolve => { release = resolve; });
  return { promise, release };
}

async function fixture() {
  const repository = createRepositories(":memory:");
  repos.push(repository);
  const now = new Date().toISOString();
  await repository.banks.saveVerified({
    id: "33333333-3333-4333-8333-333333333333", localUserId: userId,
    label: "GTBank", providerAccountId: "verified-gtbank", bankCode: "058",
    bankName: "GTBank", maskedAccountNumber: "•••• 1234", accountHolderName: "TEST PERSON",
    verified: true, createdAt: now, updatedAt: now
  });
  const intent = {
    intent: "BANK_WITHDRAWAL" as const, currency: "NGN" as const, amount: 40000,
    destination: { kind: "SAVED_BANK" as const, label: "GTBank" }, requiresApproval: true as const
  };
  const plan = await bindVerifiedPlanDestinations(buildMoneyPlan(intent, 300000), userId, repository.banks);
  const hash = fingerprintMoneyPlan(plan);
  const saved = await repository.plans.create({
    localUserId: userId, originalInstruction: "Test: withdraw 40000 to GTBank", intent, plan, planHash: hash
  });
  await repository.plans.recordGuard(saved.id, userId, "REVIEW", [], hash);
  await repository.plans.approve(saved.id, userId, hash);

  const reached = gate<void>();
  const providerResponse = gate<unknown>();
  const offrampNigeria = vi.fn().mockImplementation(async () => {
    reached.release();
    return providerResponse.promise;
  });
  const gateway = {
    listAccountBalances: vi.fn().mockResolvedValue({ data: [{ currency: "CNGN", availableBalance: "300000.00" }] }),
    offrampNigeria,
    getProposal: vi.fn().mockResolvedValue({ proposalId: "provider-proposal-1", status: "PENDING_SIGNATURES" }),
    getProposalSignPayload: vi.fn().mockResolvedValue({ hashToSign: "0x" + "b".repeat(64) })
  } as unknown as BmoniGateway;
  const userService = {
    getMapping: vi.fn().mockResolvedValue({ localUserId: userId, bmoniUserId: "fixture-bmoni-user" })
  } as unknown as BmoniUserService;
  const app = buildApp({
    getBmoniGateway: () => gateway,
    getBmoniUserService: () => userService,
    getBankAccountRepository: () => repository.banks,
    getMoneyPlanRepository: () => repository.plans,
    getExecutionRepository: () => repository.executions,
    getPocketRepository: () => repository.pockets,
    getWalletOwnershipRepository: () => ({
      findByLocalUserId: vi.fn().mockResolvedValue({
        localUserId: userId, bmoniSmartWalletId: "fixture-smart-wallet"
      })
    } as unknown as RepositorySet["wallets"])
  });
  apps.push(app);
  const prepare = () => app.inject({
    method: "POST", url: `/api/operator/plans/${saved.id}/execution/prepare`,
    payload: { localUserId: userId }
  });
  const status = (localUserId = userId) => app.inject({
    method: "GET", url: `/api/operator/plans/${saved.id}/execution/preparation?localUserId=${localUserId}`
  });
  return { app, repository, gateway, offrampNigeria, prepare, status, reached, providerResponse, planId: saved.id };
}

describe("Cross-plan spendable pre-submission protection", () => {
  it("never calls the provider for a second plan whose combined withdrawal and pocket commitments exceed available funds", async () => {
    const f = await fixture();
    const first = f.prepare();
    await f.reached.promise;
    const otherIntent = {
      intent: "MULTI_ACTION" as const, requiresApproval: true,
      actions: [
        { intent: "BANK_WITHDRAWAL" as const, currency: "NGN" as const, amount: 260000,
          destination: { kind: "SAVED_BANK" as const, label: "GTBank" },
          requiresApproval: true as const },
        { intent: "ALLOCATE_POCKET" as const, currency: "NGN" as const, amount: 20000,
          pocket: { name: "Laptop" }, requiresApproval: false as const }
      ]
    };
    const otherPlan = await bindVerifiedPlanDestinations(
      buildMoneyPlan(otherIntent, 300000), userId, f.repository.banks
    );
    const hash = fingerprintMoneyPlan(otherPlan);
    const stored = await f.repository.plans.create({
      localUserId: userId, originalInstruction: "Other plan, too large combined",
      intent: otherIntent, plan: otherPlan, planHash: hash
    });
    await f.repository.plans.recordGuard(stored.id, userId, "REVIEW", [], hash);
    await f.repository.plans.approve(stored.id, userId, hash);
    const competing = await f.app.inject({
      method: "POST", url: `/api/operator/plans/${stored.id}/execution/prepare`,
      payload: { localUserId: userId }
    });
    expect(competing.statusCode).toBe(409);
    expect(competing.json().code).toBe("SPENDABLE_CAPACITY_RESERVED");
    expect(f.offrampNigeria).toHaveBeenCalledTimes(1);
    expect(await f.repository.executions.findPreparationHold(stored.id, userId)).toBeNull();
    f.providerResponse.release({ proposalId: "provider-proposal-1", status: "PENDING_SIGNATURES" });
    expect((await first).statusCode).toBe(200);
  });
});

describe("Durable provider proposal preparation through Fastify", () => {
  it("allows only one provider submission during a concurrent request race", async () => {
    const f = await fixture();
    const first = f.prepare();
    await f.reached.promise;
    const second = await f.prepare();
    expect(second.statusCode).toBe(409);
    expect(second.json().code).toBe("PROVIDER_PREPARATION_ALREADY_CLAIMED");
    expect(f.offrampNigeria).toHaveBeenCalledTimes(1);
    const pending = await f.status();
    expect(pending.statusCode).toBe(200);
    expect(pending.json()).toMatchObject({
      state: "RESERVED", requiresManualReconciliation: true, automaticRetryAllowed: false
    });
    f.providerResponse.release({ proposalId: "provider-proposal-1", status: "PENDING_SIGNATURES" });
    const completed = await first;
    expect(completed.statusCode).toBe(200);
    expect(completed.json().execution.proposalId).toBe("provider-proposal-1");
    expect((await f.status()).json()).toMatchObject({
      state: "PROPOSAL_RECORDED", providerProposalRecorded: true,
      requiresManualReconciliation: false, automaticRetryAllowed: false
    });
    const third = await f.prepare();
    expect(third.statusCode).toBe(200);
    expect(f.offrampNigeria).toHaveBeenCalledTimes(1);
  });

  it("a missing proposal ID leaves a terminal manual-reconciliation hold and no retry", async () => {
    const f = await fixture();
    const initial = f.prepare();
    await f.reached.promise;
    f.providerResponse.release({ status: "PENDING_SIGNATURES" });
    const response = await initial;
    expect(response.statusCode).toBe(502);
    expect(response.json().code).toBe("PROVIDER_OUTCOME_UNKNOWN");
    expect((await f.status()).json()).toMatchObject({
      state: "PROVIDER_OUTCOME_UNKNOWN", automaticRetryAllowed: false
    });
    expect((await f.prepare()).statusCode).toBe(409);
    expect(f.offrampNigeria).toHaveBeenCalledTimes(1);
  });

  it("a rejected provider attempt is never automatically replayed", async () => {
    const f = await fixture();
    const first = f.prepare();
    await f.reached.promise;
    // Make the provider reject in the original promise without unhandled rejection.
    f.providerResponse.release(Promise.reject(new Error("Provider timeout; outcome uncertain")));
    const outcome = await first;
    expect(outcome.statusCode).toBeGreaterThanOrEqual(500);
    expect((await f.status()).json().state).toBe("PROVIDER_OUTCOME_UNKNOWN");
    expect((await f.prepare()).statusCode).toBe(409);
    expect(f.offrampNigeria).toHaveBeenCalledTimes(1);
  });

  it("preparation status cannot be read under a different local owner", async () => {
    const f = await fixture();
    const first = f.prepare();
    await f.reached.promise;
    expect((await f.status(other)).statusCode).toBe(404);
    f.providerResponse.release({ proposalId: "provider-proposal-1", status: "PENDING_SIGNATURES" });
    await first;
  });
});
