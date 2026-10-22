import { describe, expect, it } from "vitest";
import { parseSandboxWorkspace } from "./sandbox-contract";

const owner = "11111111-1111-4111-8111-111111111111";
const planId = "33333333-3333-4333-8333-333333333333";
const checks = Array.from({ length: 8 }, (_, i) => ({
  rule: "RULE_" + i, passed: true, severity: "info", message: "Simulated check"
}));
const initial = () => ({
  localUserId: owner, simulated: true, provider: "moniflow-sandbox",
  providerBalance: 300000, internalAllocated: 0, availableToSpend: 300000,
  resetCount: 0, plan: null, activity: []
});
const completed = () => ({
  ...initial(), providerBalance: 260000, internalAllocated: 20000, availableToSpend: 240000,
  plan: {
    id: planId, state: "COMPLETED", planHash: "a".repeat(64),
    approvedHash: "a".repeat(64), verdict: { verdict: "REVIEW", checks },
    plan: { totals: { externalMovement: 40000, internalAllocation: 20000, availableAfter: 240000 },
      actions: [
        { index: 1, kind: "BANK_WITHDRAWAL", amount: 40000, label: "GTBank" },
        { index: 2, kind: "ALLOCATE_POCKET", amount: 20000, label: "Laptop" }
      ] }
  },
  activity: [
    { reference: planId + ":withdrawal", kind: "BANK_WITHDRAWAL",
      source: "simulated_external", amount: 40000, label: "GTBank", status: "SIMULATED" },
    { reference: planId + ":allocation", kind: "POCKET_ALLOCATION",
      source: "simulated_internal", amount: 20000, label: "Laptop", status: "SIMULATED" }
  ]
});
describe("authenticated server-backed sandbox client contract", () => {
  it("parses initial and completed owner-scoped simulated snapshots", () => {
    expect(parseSandboxWorkspace(initial()).availableToSpend).toBe(300000);
    expect(parseSandboxWorkspace(completed()).availableToSpend).toBe(240000);
  });
  it("rejects provider-looking results and all inconsistent money states", () => {
    const p = completed();
    const variants = [
      { ...p, simulated: false },
      { ...p, provider: "bmoni" },
      { ...p, localUserId: "not-valid" },
      { ...p, availableToSpend: 999999 },
      { ...p, providerBalance: 300000.1 },
      { ...p, resetCount: -1 },
      { ...p, activity: [{ ...p.activity[0]!, status: "COMPLETED" }, p.activity[1]] },
      { ...p, activity: [{ ...p.activity[0]!, source: "simulated_internal" }, p.activity[1]] },
      { ...p, plan: { ...p.plan, approvedHash: null } },
      { ...p, plan: { ...p.plan, plan: {
        ...p.plan.plan, totals: { ...p.plan.plan.totals, availableAfter: 999999 }
      } } },
      { ...p, activity: [p.activity[0], p.activity[0]] },
      { ...initial(), activity: p.activity }
    ];
    for (const variant of variants) {
      expect(() => parseSandboxWorkspace(variant)).toThrow(/simulated|ledger|withheld/i);
    }
  });
});
