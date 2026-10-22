import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { providerResultPresentation } from "./provider-result-presentation";

describe("Figma v5 — exact authorization and provider result presentation", () => {
  it("treats pending, signing, missing and unknown statuses as unconfirmed", () => {
    for (const s of [null, undefined, "PREPARING", "PROCESSING", "AWAITING_DEVICE_SIGNATURE"] as const) {
      const v = providerResultPresentation(s);
      expect(v.tone).not.toBe("success");
      expect(v.title).not.toBe("Movement complete.");
    }
    const unknown = providerResultPresentation("UNKNOWN" as "COMPLETED");
    expect(unknown.stateLabel).toBe("RESULT UNAVAILABLE");
    expect(unknown.tone).toBe("warning");
  });

  it("reserves provider-confirmed success for the completed state only", () => {
    expect(providerResultPresentation("COMPLETED").tone).toBe("success");
    expect(providerResultPresentation("COMPLETED").stateLabel).toBe("PROVIDER CONFIRMED");
    expect(providerResultPresentation("FAILED").title).toBe("Not completed.");
    expect(providerResultPresentation("FAILED").tone).toBe("warning");
    expect(providerResultPresentation("PROCESSING").description).toMatch(/not proof/i);
  });

  it("keeps the existing approval fingerprint, device PIN, provider reads and terminal accounting", () => {
    const approve = readFileSync("apps/mobile/app/operator/approve.tsx", "utf8");
    const signing = readFileSync("apps/mobile/app/operator/signing.tsx", "utf8");
    const execution = readFileSync("apps/mobile/app/operator/execution.tsx", "utf8");
    const result = readFileSync("apps/mobile/app/operator/result.tsx", "utf8");
    expect(approve).toContain("approvePlan(planId, localUserId, authorization.planHash)");
    expect(approve).toContain("setAuthorization(null)");
    expect(approve).toContain('authorization.status === "APPROVED"');
    expect(approve).toContain("PLAN APPROVED · NOT SENT");
    expect(signing).toContain("bmoniDevice.signTransactionHash(execution.hashToSign, pin)");
    expect(signing).toContain('provider.provider === "moniflow-sandbox"');
    expect(signing).toContain("const proposalReady =");
    expect(execution).toContain("finalizeExecution(planId, localUserId)");
    expect(execution).toContain("providerResultPresentation(execution?.state)");
    expect(result).toContain('snapshot.state === "COMPLETED"');
    expect(result).toContain("finalizeExecution(planId, localUserId)");
    expect(result).toContain("providerResultPresentation(execution?.state)");
    expect(result).toContain("loadWalletBalance(localUserId)");
  });
});
