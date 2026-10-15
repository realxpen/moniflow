import { describe, expect, it } from "vitest";
import type { ApiSandboxWorkspace } from "./sandbox-api";
import {
  isConsistentSandboxReadModel,
  simulatedActivity,
  simulatedPocketAllocations
} from "./sandbox-view";

const alice = "11111111-1111-4111-8111-111111111111";
function workspace(): ApiSandboxWorkspace {
  return {
    localUserId: alice,
    simulated: true, provider: "moniflow-sandbox",
    providerBalance: 300000, internalAllocated: 0, availableToSpend: 300000,
    resetCount: 0, plan: null, activity: []
  };
}
function completed(): ApiSandboxWorkspace {
  const base = workspace();
  return {
    ...base, providerBalance: 260000, internalAllocated: 20000, availableToSpend: 240000,
    plan: {
      id: "33333333-3333-4333-8333-333333333333", state: "COMPLETED",
      planHash: "a".repeat(64), approvedHash: "a".repeat(64),
      verdict: { verdict: "REVIEW", checks: [] },
      plan: { totals: { externalMovement: 40000, internalAllocation: 20000, availableAfter: 240000 }, actions: [] }
    },
    activity: [
      { reference: "plan:withdrawal", kind: "BANK_WITHDRAWAL",
        source: "simulated_external", amount: 40000, label: "GTBank", status: "SIMULATED" },
      { reference: "plan:allocation", kind: "POCKET_ALLOCATION",
        source: "simulated_internal", amount: 20000, label: "Laptop", status: "SIMULATED" }
    ]
  };
}
describe("isolated demo financial read models", () => {
  it("never reports an allocation before explicit simulation", () => {
    const state = workspace();
    expect(isConsistentSandboxReadModel(state)).toBe(true);
    expect(simulatedPocketAllocations(state)).toEqual([]);
    expect(simulatedActivity(state)).toEqual([]);
  });

  it("derives exactly one internal money space and two simulated activities after completion", () => {
    const state = completed();
    expect(isConsistentSandboxReadModel(state)).toBe(true);
    expect(simulatedPocketAllocations(state)).toEqual([
      { reference: "plan:allocation", label: "Laptop", amount: 20000 }
    ]);
    expect(simulatedActivity(state)).toHaveLength(2);
    expect(state.availableToSpend).toBe(240000);
    expect(state.providerBalance).toBe(260000);
  });

  it("fails closed if available, activity amounts, or reference integrity differs", () => {
    const state = completed();
    for (const invalid of [
      { ...state, availableToSpend: 239999 },
      { ...state, providerBalance: 500000, availableToSpend: 480000 },
      { ...state, internalAllocated: 21000, availableToSpend: 239000 },
      { ...state, activity: [{ ...state.activity[0]!, amount: 20000 }, state.activity[1]!] },
      { ...state, activity: [state.activity[0]!, { ...state.activity[1]!, reference: state.activity[0]!.reference }] },
      { ...state, activity: [state.activity[0]!, { ...state.activity[1]!, status: "COMPLETED" as "SIMULATED" }] },
      { ...state, plan: null }
    ]) {
      expect(isConsistentSandboxReadModel(invalid)).toBe(false);
      expect(simulatedActivity(invalid)).toEqual([]);
      expect(simulatedPocketAllocations(invalid)).toEqual([]);
    }
  });

  it("never treats external withdrawals as internal pocket allocations", () => {
    const state = completed();
    const invalid = {
      ...state, activity: [
        { ...state.activity[0]!, source: "simulated_internal" as const },
        state.activity[1]!
      ]
    };
    expect(isConsistentSandboxReadModel(invalid)).toBe(false);
    expect(simulatedPocketAllocations(invalid)).toEqual([]);
  });

  it("a reset removes all simulated records without touching real financial repositories", () => {
    const state = workspace();
    state.resetCount = 1;
    expect(simulatedPocketAllocations(state)).toEqual([]);
    expect(simulatedActivity(state)).toEqual([]);
  });
});
