import { describe, expect, it } from "vitest";

import { evaluateMoniGuard, type GuardContext } from "./index.js";

const validContext: GuardContext = {
  intent: {
    intent: "MULTI_ACTION",
    actions: [
      {
        intent: "BANK_WITHDRAWAL",
        currency: "NGN",
        amount: 40000,
        destination: { kind: "SAVED_BANK", label: "GTBank" },
        requiresApproval: true
      },
      {
        intent: "ALLOCATE_POCKET",
        currency: "NGN",
        amount: 20000,
        pocket: { name: "Laptop" },
        requiresApproval: false
      }
    ],
    requiresApproval: true
  },
  plan: {
    currency: "NGN",
    currentAvailable: 300000,
    actions: [
      {
        index: 1,
        kind: "BANK_WITHDRAWAL",
        label: "GTBank",
        description: "Withdrawal",
        amount: 40000,
        movement: "EXTERNAL",
        requiresApproval: true
      },
      {
        index: 2,
        kind: "ALLOCATE_POCKET",
        label: "Laptop",
        description: "Allocation",
        amount: 20000,
        movement: "INTERNAL",
        requiresApproval: false
      }
    ],
    totals: {
      externalMovement: 40000,
      internalAllocation: 20000,
      totalCommitted: 60000,
      availableAfter: 240000
    },
    requiresApproval: true,
    sourceIntent: "MULTI_ACTION"
  }
};

describe("MONI Guard", () => {
  it("returns REVIEW for a valid plan that still requires human authorization", () => {
    const result = evaluateMoniGuard(validContext);
    expect(result.verdict).toBe("REVIEW");
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

  it("blocks an altered amount", () => {
    const context = structuredClone(validContext);
    context.plan.actions[0]!.amount = 45000;
    context.plan.totals.externalMovement = 45000;
    context.plan.totals.totalCommitted = 65000;
    context.plan.totals.availableAfter = 235000;

    const result = evaluateMoniGuard(context);
    expect(result.verdict).toBe("BLOCK");
    expect(result.checks.find((check) => check.rule === "AMOUNT_INTEGRITY")?.passed).toBe(false);
  });

  it("blocks tampered plan totals", () => {
    const context = structuredClone(validContext);
    context.plan.totals.availableAfter = 260000;

    const result = evaluateMoniGuard(context);
    expect(result.verdict).toBe("BLOCK");
    expect(result.checks.find((check) => check.rule === "PLAN_INTEGRITY")?.passed).toBe(false);
  });

  it("blocks insufficient funds", () => {
    const context = structuredClone(validContext);
    context.plan.currentAvailable = 50000;
    context.plan.totals.availableAfter = -10000;

    const result = evaluateMoniGuard(context);
    expect(result.verdict).toBe("BLOCK");
    expect(result.checks.find((check) => check.rule === "BALANCE")?.passed).toBe(false);
  });

  it("blocks destination substitution", () => {
    const context = structuredClone(validContext);
    context.plan.actions[0]!.label = "Access Bank";

    const result = evaluateMoniGuard(context);
    expect(result.verdict).toBe("BLOCK");
    expect(result.checks.find((check) => check.rule === "DESTINATION")?.passed).toBe(false);
  });

  it("blocks removal of the human approval boundary", () => {
    const context = structuredClone(validContext);
    context.plan.requiresApproval = false;
    context.plan.actions[0]!.requiresApproval = false;

    const result = evaluateMoniGuard(context);
    expect(result.verdict).toBe("BLOCK");
    expect(result.checks.find((check) => check.rule === "HUMAN_APPROVAL")?.passed).toBe(false);
  });

  it("allows a valid non-moving balance check", () => {
    const context: GuardContext = {
      intent: { intent: "CHECK_BALANCE", currency: "NGN", requiresApproval: false },
      plan: {
        currency: "NGN",
        currentAvailable: 300000,
        actions: [{
          index: 1,
          kind: "CHECK_BALANCE",
          label: "Available balance",
          description: "Balance check",
          amount: 0,
          movement: "NONE",
          requiresApproval: false
        }],
        totals: { externalMovement: 0, internalAllocation: 0, totalCommitted: 0, availableAfter: 300000 },
        requiresApproval: false,
        sourceIntent: "CHECK_BALANCE"
      }
    };

    expect(evaluateMoniGuard(context).verdict).toBe("ALLOW");
  });
});
