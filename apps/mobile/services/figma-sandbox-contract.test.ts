import { describe, expect, it } from "vitest";

import {
  initialSandboxWorkspace, SANDBOX_COMMAND, transitionSandbox
} from "../../api/src/services/sandbox-demo/state";
import { parseApiSandboxResponse } from "./sandbox-response-validation";

const owner = "b77a2ee5-17b2-427c-b3b9-968375d4d592";

function flow() {
  const started = initialSandboxWorkspace(owner);
  const planned = transitionSandbox(started, { kind: "plan", command: SANDBOX_COMMAND });
  const approved = transitionSandbox(planned, {
    kind: "approve", planId: planned.plan!.id,
    expectedPlanHash: planned.plan!.planHash, acknowledged: true
  });
  const finished = transitionSandbox(approved, {
    kind: "execute", planId: planned.plan!.id
  });
  return { started, planned, approved, finished };
}

describe("API-to-Figma shared MVP contract", () => {
  it("accepts actual backend sandbox states at all four durable stages", () => {
    const { started, planned, approved, finished } = flow();
    for (const stage of [started, planned, approved, finished]) {
      const displayed = parseApiSandboxResponse(stage);
      expect(displayed.simulated).toBe(true);
      expect(displayed.provider).toBe("moniflow-sandbox");
      expect(displayed.availableToSpend).toBe(displayed.providerBalance - displayed.internalAllocated);
    }
    expect(parseApiSandboxResponse(planned).plan?.verdict.verdict).toBe("REVIEW");
    expect(parseApiSandboxResponse(approved).plan?.state).toBe("APPROVED");
    expect(parseApiSandboxResponse(finished)).toMatchObject({
      providerBalance: 260000, internalAllocated: 20000,
      availableToSpend: 240000, plan: { state: "COMPLETED" }
    });
    expect(parseApiSandboxResponse(finished).activity).toHaveLength(2);
  });

  it("blocks forged provider-success and malformed source states", () => {
    const { finished } = flow();
    for (const unsafe of [
      { ...finished, simulated: false },
      { ...finished, provider: "bmoni" },
      { ...finished, realFundsMoved: true },
      { ...finished, executionStarted: true },
      { ...finished, providerEvidenceReference: "claimed-receipt" },
      { ...finished, activity: finished.activity.map(e => ({ ...e, status: "COMPLETED" })) },
      { ...finished, availableToSpend: 300000 },
      { ...finished, internalAllocated: -20000 },
      { ...finished, providerBalance: 0 },
      { ...finished, activity: [] },
      { ...finished, plan: { ...finished.plan, approvedHash: null } }
    ]) {
      expect(() => parseApiSandboxResponse(unsafe)).toThrow();
    }
  });

  it("rejects premature financial activity, changed plan terms and false approvals", () => {
    const { started, planned, approved } = flow();
    expect(() => parseApiSandboxResponse({
      ...started, activity: [{ reference: "fake", kind: "BANK_WITHDRAWAL",
        source: "simulated_external", amount: 40000, label: "GTBank", status: "SIMULATED" }]
    })).toThrow();
    expect(() => parseApiSandboxResponse({
      ...planned, plan: { ...planned.plan, approvedHash: "b".repeat(64) }
    })).toThrow();
    expect(() => parseApiSandboxResponse({
      ...approved, plan: {
        ...approved.plan, plan: { ...approved.plan!.plan,
          totals: { ...approved.plan!.plan.totals, externalMovement: 90000 } }
      }
    })).toThrow();
  });

  it("cannot claim BMONI readiness from sandbox state", () => {
    const { finished } = flow();
    expect(parseApiSandboxResponse(finished)).not.toHaveProperty("walletOwnership");
    expect(parseApiSandboxResponse(finished)).not.toHaveProperty("kyc");
    expect(parseApiSandboxResponse(finished)).not.toHaveProperty("providerEvidenceReference");
  });
});
