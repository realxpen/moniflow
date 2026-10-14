import { describe, expect, it } from "vitest";
import {
  demoFinancialSnapshot, demoGuardChecks, demoOperatorTransition,
  initialDemoOperatorState, isSupportedDemoCommand
} from "./operator-demo";
import { walkthroughCommand } from "./walkthrough";

describe("isolated interactive Operator simulator", () => {
  it("recognizes only the canonical supported example, never guesses amounts or destinations", () => {
    expect(isSupportedDemoCommand(walkthroughCommand)).toBe(true);
    expect(isSupportedDemoCommand(" Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop! ")).toBe(true);
    expect(isSupportedDemoCommand("Withdraw ₦50,000 to my GTBank account and save ₦20,000 for my laptop")).toBe(false);
    expect(isSupportedDemoCommand("Send money")).toBe(false);
  });
  it("blocks skipping plan, guard, and affirmative simulated approval", () => {
    const start = initialDemoOperatorState();
    expect(demoOperatorTransition(start, { type: "SIMULATE_EXECUTION" })).toEqual(start);
    const planned = demoOperatorTransition(start, { type: "PARSE", command: walkthroughCommand });
    expect(planned.stage).toBe("plan");
    expect(demoOperatorTransition(planned, { type: "APPROVE_SIMULATION", acknowledged: true })).toEqual(planned);
    const guard = demoOperatorTransition(planned, { type: "REVIEW_PLAN" });
    expect(demoOperatorTransition(guard, { type: "APPROVE_SIMULATION", acknowledged: true })).toEqual(guard);
    const approval = demoOperatorTransition(guard, { type: "REVIEW_GUARD" });
    expect(demoOperatorTransition(approval, { type: "APPROVE_SIMULATION", acknowledged: false })).toEqual(approval);
    const ready = demoOperatorTransition(approval, { type: "APPROVE_SIMULATION", acknowledged: true });
    expect(ready.stage).toBe("execution");
    expect(demoFinancialSnapshot(ready)).toBeNull();
  });
  it("computes illustration only after approval and one explicit simulation step", () => {
    const planned = demoOperatorTransition(initialDemoOperatorState(), { type: "PARSE", command: walkthroughCommand });
    const guard = demoOperatorTransition(planned, { type: "REVIEW_PLAN" });
    const approval = demoOperatorTransition(guard, { type: "REVIEW_GUARD" });
    const ready = demoOperatorTransition(approval, { type: "APPROVE_SIMULATION", acknowledged: true });
    const done = demoOperatorTransition(ready, { type: "SIMULATE_EXECUTION" });
    expect(done).toMatchObject({ stage: "result", confirmed: true, simulationCount: 1 });
    expect(demoOperatorTransition(done, { type: "SIMULATE_EXECUTION" })).toEqual(done);
    expect(demoFinancialSnapshot(done)).toMatchObject({
      simulated: true, providerAfter: 260000, availableAfter: 240000, pocketAmount: 20000,
      activity: [{ type: "SIMULATED_EXTERNAL_WITHDRAWAL" }, { type: "SIMULATED_INTERNAL_ALLOCATION" }]
    });
  });
  it("cancellation cannot yield an execution result; reset returns to initial state", () => {
    const plan = demoOperatorTransition(initialDemoOperatorState(), { type: "PARSE", command: walkthroughCommand });
    const cancelled = demoOperatorTransition(plan, { type: "CANCEL" });
    expect(cancelled.stage).toBe("cancelled");
    expect(demoFinancialSnapshot(cancelled)).toBeNull();
    expect(demoOperatorTransition(cancelled, { type: "SIMULATE_EXECUTION" })).toEqual(cancelled);
    expect(demoOperatorTransition(cancelled, { type: "RESET" })).toEqual(initialDemoOperatorState());
  });
  it("discloses that the real bank destination was never verified", () => {
    expect(demoGuardChecks()).toEqual(expect.arrayContaining([expect.objectContaining({
      label: "GTBank destination", passed: false
    })]));
  });
});
