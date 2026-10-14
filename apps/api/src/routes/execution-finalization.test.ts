import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../create-app.js";
import { createRepositories, type RepositorySet } from "../repositories/index.js";
import type { MoniflowIntent } from "../schemas/intent.js";
import type { MoneyPlan } from "../schemas/money-plan.js";
import type { BmoniGateway } from "../services/bmoni/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";

const userId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(app => app.close()));
});

const intent: MoniflowIntent = {
  intent: "MULTI_ACTION",
  requiresApproval: true,
  actions: [
    {
      intent: "BANK_WITHDRAWAL", currency: "NGN", amount: 40000,
      destination: { kind: "SAVED_BANK", label: "GTBank" }, requiresApproval: true
    },
    {
      intent: "ALLOCATE_POCKET", currency: "NGN", amount: 20000,
      pocket: { name: "Laptop" }, requiresApproval: false
    }
  ]
};

const plan: MoneyPlan = {
  currency: "NGN",
  currentAvailable: 300000,
  requiresApproval: true,
  sourceIntent: "MULTI_ACTION",
  actions: [
    {
      index: 1, kind: "BANK_WITHDRAWAL", label: "GTBank",
      description: "Withdrawal", amount: 40000,
      movement: "EXTERNAL", requiresApproval: true
    },
    {
      index: 2, kind: "ALLOCATE_POCKET", label: "Laptop",
      description: "Allocation", amount: 20000,
      movement: "INTERNAL", requiresApproval: false
    }
  ],
  totals: {
    externalMovement: 40000,
    internalAllocation: 20000,
    totalCommitted: 60000,
    availableAfter: 240000
  }
};

async function fixture(state: "COMPLETED" | "PROCESSING") {
  const repositories = createRepositories(":memory:");
  const getProposal = vi.fn().mockResolvedValue({ proposalId: "provider-proposal-1", status: "PROCESSING" });
  const createUser = vi.fn().mockResolvedValue({
    bmoniUserId: "provider-user-1", email: "sandbox@example.test", firstName: "Sandbox"
  });
  const gateway = {
    getProposal,
    createUser,
    offrampNigeria: vi.fn(),
    signProposal: vi.fn()
  } as unknown as BmoniGateway;

  const userService = new BmoniUserService(gateway, repositories.users);
  await userService.createOrFindMapping({
    localUserId: userId, email: "sandbox@example.test",
    firstName: "Sandbox", phoneNumber: "+2348012345678"
  });
  const saved = await repositories.plans.create({
    localUserId: userId,
    originalInstruction: "Withdraw 40000 to GTBank and save 20000 for Laptop",
    intent, plan, planHash: "a".repeat(64)
  });
  const now = new Date().toISOString();
  await repositories.executions.create({
    planId: saved.id, localUserId: userId, providerProposalId: "provider-proposal-1",
    providerBankAccountId: "bank-1", amount: 40000, currency: "NGN",
    signHash: null, providerStatus: state, state, createdAt: now, updatedAt: now
  });

  const app = buildApp({
    getBmoniGateway: () => gateway,
    getBmoniUserService: () => userService,
    getWalletOwnershipRepository: () => repositories.wallets,
    getMoneyPlanRepository: () => repositories.plans,
    getBankAccountRepository: () => repositories.banks,
    getExecutionRepository: () => repositories.executions,
    getPocketRepository: () => repositories.pockets,
    getActivityRepository: () => repositories.activities
  });
  app.addHook("onClose", async () => repositories.close());
  apps.push(app);

  const finalize = (asUser = userId) => app.inject({
    method: "POST", url: "/api/operator/plans/" + saved.id + "/execution/finalize",
    payload: { localUserId: asUser }
  });
  return { app, repositories, getProposal, gateway, finalize, planId: saved.id };
}

describe("provider-confirmed finalization via actual API and SQLite ledgers", () => {
  it("records one external movement and one internal allocation across repeated requests", async () => {
    const { repositories, gateway, finalize, planId } = await fixture("COMPLETED");
    const responses = await Promise.all([finalize(), finalize(), finalize()]);
    expect(responses.map(response => response.statusCode)).toEqual([200, 200, 200]);
    expect((await repositories.pockets.list(userId))).toMatchObject([
      { name: "Laptop", allocatedAmount: 20000 }
    ]);
    expect(await repositories.pockets.totalAllocated(userId)).toBe(20000);
    const activities = await repositories.activities.list(userId);
    expect(activities).toHaveLength(2);
    expect(activities.map(row => row.kind).sort()).toEqual(["BANK_WITHDRAWAL", "POCKET_ALLOCATION"]);
    expect(activities.every(row => row.metadata.planId === planId)).toBe(true);
    expect(activities.find(row => row.kind === "BANK_WITHDRAWAL")).toMatchObject({
      amount: 40000, source: "provider", status: "COMPLETED"
    });
    expect(activities.find(row => row.kind === "POCKET_ALLOCATION")).toMatchObject({
      amount: 20000, source: "internal", status: "COMPLETED"
    });
    expect(vi.mocked(gateway.offrampNigeria)).not.toHaveBeenCalled();
    expect(vi.mocked(gateway.signProposal)).not.toHaveBeenCalled();
  });

  it("never finalizes a non-terminal provider state and preserves both ledgers", async () => {
    const { repositories, getProposal, finalize } = await fixture("PROCESSING");
    const response = await finalize();
    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: "PROVIDER_NOT_COMPLETED", providerStatus: "PROCESSING" });
    expect(getProposal).toHaveBeenCalledTimes(1);
    expect(await repositories.pockets.totalAllocated(userId)).toBe(0);
    expect(await repositories.activities.list(userId)).toHaveLength(0);
  });

  it("does not allow another local identity to finalize or read the same plan's accounting", async () => {
    const { repositories, finalize } = await fixture("COMPLETED");
    expect((await finalize(otherId)).statusCode).toBe(404);
    expect(await repositories.activities.list(otherId)).toHaveLength(0);
    expect(await repositories.pockets.totalAllocated(otherId)).toBe(0);
    expect(await repositories.activities.list(userId)).toHaveLength(0);
  });
});
