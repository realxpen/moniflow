import { describe, expect, it } from "vitest";

import type { GuardCheck } from "@moniflow/moniguard";

import type {
  CreatePersistedMoneyPlanInput,
  MoneyPlanRepository,
  PersistedMoneyPlan
} from "../../repositories/money-plan.js";
import type { MoniflowIntent } from "../../schemas/intent.js";
import type { MoneyPlan } from "../../schemas/money-plan.js";
import {
  ApprovalStateError,
  approveMoneyPlan,
  fingerprintMoneyPlan,
  requireApprovedPlanForExecution
} from "./approval.js";

const localUserId = "11111111-1111-4111-8111-111111111111";
const planId = "22222222-2222-4222-8222-222222222222";

function fixturePlan(): MoneyPlan {
  return {
    currency: "NGN",
    currentAvailable: 300000,
    actions: [
      { index: 1, kind: "BANK_WITHDRAWAL", label: "GTBank", description: "Withdrawal", amount: 40000, movement: "EXTERNAL", requiresApproval: true },
      { index: 2, kind: "ALLOCATE_POCKET", label: "Laptop", description: "Allocation", amount: 20000, movement: "INTERNAL", requiresApproval: false }
    ],
    totals: { externalMovement: 40000, internalAllocation: 20000, totalCommitted: 60000, availableAfter: 240000 },
    requiresApproval: true,
    sourceIntent: "MULTI_ACTION"
  };
}

function fixtureIntent(): MoniflowIntent {
  return {
    intent: "MULTI_ACTION",
    requiresApproval: true,
    actions: [
      { intent: "BANK_WITHDRAWAL", currency: "NGN", amount: 40000, destination: { kind: "SAVED_BANK", label: "GTBank" }, requiresApproval: true },
      { intent: "ALLOCATE_POCKET", currency: "NGN", amount: 20000, pocket: { name: "Laptop" }, requiresApproval: false }
    ]
  };
}

class FakeMoneyPlanRepository implements MoneyPlanRepository {
  record: PersistedMoneyPlan;

  constructor() {
    const plan = fixturePlan();
    const hash = fingerprintMoneyPlan(plan);
    this.record = {
      id: planId,
      localUserId,
      originalInstruction: "Withdraw ₦40,000 to GTBank and save ₦20,000 for laptop",
      status: "AWAITING_USER_APPROVAL",
      intent: fixtureIntent(),
      plan,
      guardVerdict: "REVIEW",
      planHash: hash,
      approvedPlanHash: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async create(_input: CreatePersistedMoneyPlanInput) { return this.record; }
  async findById(id: string, userId: string) { return id === this.record.id && userId === this.record.localUserId ? this.record : null; }
  async recordGuard(_id: string, _userId: string, verdict: "ALLOW" | "REVIEW" | "BLOCK", _checks: GuardCheck[], currentPlanHash: string) {
    this.record.guardVerdict = verdict;
    this.record.planHash = currentPlanHash;
    this.record.status = verdict === "BLOCK" ? "BLOCKED" : verdict === "REVIEW" ? "AWAITING_USER_APPROVAL" : "APPROVED";
    return this.record;
  }
  async approve(_id: string, _userId: string, approvedPlanHash: string) {
    if (this.record.status !== "AWAITING_USER_APPROVAL" || this.record.guardVerdict !== "REVIEW") return this.record;
    this.record.status = "APPROVED";
    this.record.approvedPlanHash = approvedPlanHash;
    this.record.approvedAt = new Date().toISOString();
    return this.record;
  }
  async invalidateApproval() {
    this.record.status = "VALIDATING";
    this.record.guardVerdict = null;
    this.record.approvedPlanHash = null;
    this.record.approvedAt = null;
    return this.record;
  }
  async close() {}
}

describe("Phase 11 human approval", () => {
  it("blocks execution while the plan is awaiting approval", async () => {
    const repository = new FakeMoneyPlanRepository();
    await expect(requireApprovedPlanForExecution(repository, planId, localUserId)).rejects.toMatchObject({ code: "NOT_APPROVED" });
  });

  it("transitions AWAITING_USER_APPROVAL to APPROVED only on explicit approval", async () => {
    const repository = new FakeMoneyPlanRepository();
    const hash = fingerprintMoneyPlan(repository.record.plan);
    const approved = await approveMoneyPlan(repository, planId, localUserId, hash);
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedPlanHash).toBe(hash);
    await expect(requireApprovedPlanForExecution(repository, planId, localUserId)).resolves.toMatchObject({ status: "APPROVED" });
  });

  it("invalidates approval if the approved amount changes", async () => {
    const repository = new FakeMoneyPlanRepository();
    await approveMoneyPlan(repository, planId, localUserId, fingerprintMoneyPlan(repository.record.plan));
    const withdrawal = repository.record.plan.actions[0];
    if (withdrawal?.kind !== "BANK_WITHDRAWAL") throw new Error("fixture withdrawal missing");
    withdrawal.amount = 41000;

    await expect(requireApprovedPlanForExecution(repository, planId, localUserId)).rejects.toMatchObject({ code: "NOT_APPROVED" });
    expect(repository.record.status).toBe("VALIDATING");
    expect(repository.record.approvedPlanHash).toBeNull();
  });

  it("invalidates approval if the approved destination changes", async () => {
    const repository = new FakeMoneyPlanRepository();
    await approveMoneyPlan(repository, planId, localUserId, fingerprintMoneyPlan(repository.record.plan));
    const withdrawal = repository.record.plan.actions[0];
    if (withdrawal?.kind !== "BANK_WITHDRAWAL") throw new Error("fixture withdrawal missing");
    withdrawal.label = "Access Bank";

    await expect(requireApprovedPlanForExecution(repository, planId, localUserId)).rejects.toMatchObject({ code: "NOT_APPROVED" });
    expect(repository.record.status).toBe("VALIDATING");
    expect(repository.record.guardVerdict).toBeNull();
  });

  it("rejects a stale approval hash and requires Guard to run again", async () => {
    const repository = new FakeMoneyPlanRepository();
    await expect(approveMoneyPlan(repository, planId, localUserId, "0".repeat(64))).rejects.toBeInstanceOf(ApprovalStateError);
    expect(repository.record.status).toBe("VALIDATING");
    expect(repository.record.approvedPlanHash).toBeNull();
  });
});
