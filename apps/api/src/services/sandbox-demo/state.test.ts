import { describe, expect, it } from "vitest";
import { initialSandboxWorkspace, SANDBOX_COMMAND, SandboxActionError, transitionSandbox } from "./state.js";

const alice = "11111111-1111-4111-8111-111111111111";
const started = () => transitionSandbox(initialSandboxWorkspace(alice), { kind: "plan", command: SANDBOX_COMMAND });

describe("isolated API-backed sandbox domain", () => {
  it("uses the production deterministic parser, Money Plan and real 8-rule MONI Guard", () => {
    const state = started();
    expect(state.simulated).toBe(true);
    expect(state.plan?.plan.totals).toEqual({
      externalMovement: 40000, internalAllocation: 20000,
      totalCommitted: 60000, availableAfter: 240000
    });
    expect(state.plan?.verdict.verdict).toBe("REVIEW");
    expect(state.plan?.verdict.checks).toHaveLength(8);
    expect(state.plan?.verdict.checks.find(item => item.rule === "DESTINATION")?.message).toContain("no real bank account was verified");
    expect(transitionSandbox(state, { kind: "plan", command: SANDBOX_COMMAND })).toEqual(state);
  });
  it("requires a matching plan hash and actual human acknowledgment", () => {
    const state = started();
    expect(() => transitionSandbox(state, { kind: "execute", planId: state.plan!.id })).toThrow("approval");
    expect(() => transitionSandbox(state, { kind: "approve", planId: state.plan!.id, expectedPlanHash: "x".repeat(64), acknowledged: true })).toThrow("fingerprint");
    const approved = transitionSandbox(state, { kind: "approve", planId: state.plan!.id, expectedPlanHash: state.plan!.planHash, acknowledged: true });
    expect(approved.plan?.state).toBe("APPROVED");
    expect(transitionSandbox(approved, { kind: "approve", planId: state.plan!.id, expectedPlanHash: state.plan!.planHash, acknowledged: true })).toEqual(approved);
  });
  it("executes simulated debit and pocket credit exactly once despite repeat requests", () => {
    const state = started();
    const approved = transitionSandbox(state, { kind: "approve", planId: state.plan!.id, expectedPlanHash: state.plan!.planHash, acknowledged: true });
    const complete = transitionSandbox(approved, { kind: "execute", planId: state.plan!.id });
    expect(complete).toMatchObject({
      providerBalance: 260000, internalAllocated: 20000, availableToSpend: 240000,
      plan: { state: "COMPLETED" }
    });
    expect(complete.activity).toHaveLength(2);
    expect(complete.activity.map(x => x.source)).toEqual(["simulated_external", "simulated_internal"]);
    expect(transitionSandbox(complete, { kind: "execute", planId: state.plan!.id })).toEqual(complete);
    expect(transitionSandbox(complete, { kind: "plan", command: SANDBOX_COMMAND })).toEqual(complete);
  });
  it("rejects instructions beyond the explicitly supported demo", () => {
    expect(() => transitionSandbox(initialSandboxWorkspace(alice), { kind: "plan", command: "Withdraw ₦100,000 to GTBank" })).toThrow(SandboxActionError);
  });
  it("resets only its own simulated workspace and increments the reset counter", () => {
    const current = started();
    const reset = transitionSandbox(current, { kind: "reset", acknowledgment: "RESET_SIMULATED_WORKSPACE" });
    expect(reset).toMatchObject({ providerBalance: 300000, availableToSpend: 300000, resetCount: 1, plan: null, activity: [] });
  });
});
