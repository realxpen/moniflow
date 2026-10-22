import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { providerResultPresentation } from "./provider-result-presentation";

const src = (path: string) => readFileSync(`apps/mobile/${path}`, "utf8");

describe("Figma v6 — accessible financial status and release QA", () => {
  it("makes the exact approval discernible to assistive technology while disabled", () => {
    const confirmation = src("components/ui/ConfirmationButton.tsx");
    expect(confirmation).toContain("accessibilityLabel={label}");
    expect(confirmation).toContain('accessibilityRole="button"');
    expect(confirmation).toContain("accessibilityState={{ disabled: Boolean(disabled) }}");
    expect(confirmation).toContain("if (disabled) return;");
    expect(confirmation).toContain("approval alone does not move money");
    const approval = src("app/operator/approve.tsx");
    expect(approval).toContain("approvePlan(planId, localUserId, authorization.planHash)");
  });

  it("speaks stage, rule, and provider check states independently of their colors", () => {
    const pill = src("components/ui/StatusPill.tsx");
    const progress = src("components/operator/ProgressStep.tsx");
    const guard = src("components/guard/GuardCheck.tsx");
    const stage = src("components/operator/OperatorJourneyHeader.tsx");
    const header = src("components/ui/FlowHeader.tsx");
    expect(pill).toContain("accessibilityLabel={`Status: ${label}`}");
    expect(progress).toContain('failed: "FAILED"');
    expect(progress).toContain("accessibilityLabel={`Step ${index}: ${title}.");
    expect(guard).toContain("accessibilityLabel={`MONI Guard rule ${rule}:");
    expect(stage).toContain('Money Plan review step ${selected + 1} of 3');
    expect(header).toContain('accessibilityRole="header"');
  });

  it("never marks a failed provider-processing step as done", () => {
    const execution = src("app/operator/execution.tsx");
    expect(execution).toContain('execution?.state === "FAILED" ? "failed"');
    expect(execution).toContain('execution?.state === "COMPLETED" ? "complete"');
    expect(execution).toContain("finalizeExecution(planId, localUserId)");
    expect(providerResultPresentation("FAILED").tone).not.toBe("success");
    expect(providerResultPresentation("PROCESSING").tone).not.toBe("success");
  });

  it("describes signing PIN securely without logs or backend transport", () => {
    const signing = src("app/operator/signing.tsx");
    expect(signing).toContain('accessibilityLabel="Six-digit device signing PIN"');
    expect(signing).toContain("secureTextEntry");
    expect(signing).toContain("bmoniDevice.signTransactionHash(execution.hashToSign, pin)");
    expect(signing).not.toMatch(/console\.(?:log|warn|error)\s*\([^)]*\bpin\b/i);
  });

  it("keeps unknown results unavailable rather than known processing", () => {
    const result = src("app/operator/result.tsx");
    expect(result).toContain('"Provider outcome unavailable"');
    expect(result).toContain("No trustworthy provider result is available yet.");
    expect(result).toContain('snapshot.state === "COMPLETED"');
  });
});
