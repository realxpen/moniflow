import { describe, expect, it } from "vitest";

import { buildMoneyPlan, UnsupportedPlanIntentError } from "./engine.js";

describe("buildMoneyPlan", () => {
  it("subtracts external and internal money from available balance", () => {
    const plan = buildMoneyPlan({
      intent: "MULTI_ACTION",
      actions: [
        {
          intent: "BANK_WITHDRAWAL",
          currency: "NGN",
          amount: 40_000,
          destination: { kind: "SAVED_BANK", label: "GTBank" },
          requiresApproval: true
        },
        {
          intent: "ALLOCATE_POCKET",
          currency: "NGN",
          amount: 20_000,
          pocket: { name: "Laptop" },
          requiresApproval: false
        }
      ],
      requiresApproval: true
    }, 300_000);

    expect(plan.totals).toEqual({
      externalMovement: 40_000,
      internalAllocation: 20_000,
      totalCommitted: 60_000,
      availableAfter: 240_000
    });
    expect(plan.actions.map((action) => action.label)).toEqual(["GTBank", "Laptop"]);
  });

  it("subtracts only a bank withdrawal for BANK_WITHDRAWAL", () => {
    const plan = buildMoneyPlan({
      intent: "BANK_WITHDRAWAL",
      currency: "NGN",
      amount: 40_000,
      destination: { kind: "SAVED_BANK", label: "GTBank" },
      requiresApproval: true
    }, 300_000);

    expect(plan.totals.externalMovement).toBe(40_000);
    expect(plan.totals.internalAllocation).toBe(0);
    expect(plan.totals.availableAfter).toBe(260_000);
  });

  it("subtracts a pocket allocation from unallocated availability", () => {
    const plan = buildMoneyPlan({
      intent: "ALLOCATE_POCKET",
      currency: "NGN",
      amount: 20_000,
      pocket: { name: "Laptop" },
      requiresApproval: false
    }, 300_000);

    expect(plan.totals.externalMovement).toBe(0);
    expect(plan.totals.internalAllocation).toBe(20_000);
    expect(plan.totals.availableAfter).toBe(280_000);
  });

  it.each([
    { intent: { intent: "CHECK_BALANCE", currency: "NGN", requiresApproval: false } as const },
    { intent: { intent: "CREATE_POCKET", pocket: { name: "Laptop" }, requiresApproval: false } as const },
    { intent: { intent: "SHOW_ACTIVITY", requiresApproval: false } as const }
  ])("keeps available balance unchanged for non-money action", ({ intent }) => {
    const plan = buildMoneyPlan(intent, 300_000);
    expect(plan.totals).toEqual({
      externalMovement: 0,
      internalAllocation: 0,
      totalCommitted: 0,
      availableAfter: 300_000
    });
  });

  it("keeps the exact arithmetic visible even before guard checks", () => {
    const plan = buildMoneyPlan({
      intent: "BANK_WITHDRAWAL",
      currency: "NGN",
      amount: 400_000,
      destination: { kind: "SAVED_BANK", label: "GTBank" },
      requiresApproval: true
    }, 300_000);
    expect(plan.totals.availableAfter).toBe(-100_000);
  });

  it("refuses to create a plan for unsupported intent", () => {
    expect(() => buildMoneyPlan({
      intent: "UNSUPPORTED",
      requiresApproval: false,
      reason: "AMBIGUOUS"
    }, 300_000)).toThrow(UnsupportedPlanIntentError);
  });
});
