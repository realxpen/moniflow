import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { guardDecisionPresentation, operatorJourneyStages, operatorStagePosition } from "./operator-journey-presentation";

describe("Figma v4 Operator stage and Guard visual safeguards", () => {
  it("shows three navigational stages without treating them as payment approval", () => {
    expect(operatorJourneyStages.map(s => s.id)).toEqual(["understand", "plan", "guard"]);
    expect(operatorStagePosition("understand")).toBe(0);
    expect(operatorStagePosition("plan")).toBe(1);
    expect(operatorStagePosition("guard")).toBe(2);
  });
  it("fails closed for unavailable, blocked and review states", () => {
    expect(guardDecisionPresentation("REVIEW", false)).toEqual({
      label: "REVIEW REQUIRED", tone: "warning", completionLabel: "HUMAN REVIEW REQUIRED"
    });
    expect(guardDecisionPresentation("BLOCK", false).tone).toBe("error");
    for (const value of [null, undefined, "", "APPROVED", "UNKNOWN"]) {
      expect(guardDecisionPresentation(value, false).tone).toBe("warning");
      expect(guardDecisionPresentation(value, false).completionLabel).toBe("NO VALID GUARD VERDICT");
    }
    expect(guardDecisionPresentation("REVIEW", true).tone).toBe("processing");
    expect(guardDecisionPresentation("ALLOW", false).completionLabel).toBe("GUARD CHECKS COMPLETE");
  });
  it("preserves persisted plan and server Guard boundaries", () => {
    const paths = ["processing", "plan", "guard"].map(x => readFileSync("apps/mobile/app/operator/" + x + ".tsx", "utf8"));
    for (const source of paths) expect(source).toContain("<OperatorJourneyHeader");
    expect(paths[1]).toContain("prepareMoneyPlan(intent, localUserId, command || undefined)");
    expect(paths[1]).toContain("plan.actions.map");
    expect(paths[1]).toContain("plan.totals.availableAfter");
    expect(paths[2]).toContain("runMoniGuard(planId, localUserId)");
    expect(paths[2]).toContain("setResult(null)");
    expect(paths[2]).toContain("guardDecisionPresentation(result?.verdict, loading)");
    expect(paths[2]).toContain('!loading && result?.status === "AWAITING_USER_APPROVAL"');
    expect(paths[2]).toContain('!loading && result?.status === "BLOCKED"');
    const header = readFileSync("apps/mobile/components/operator/OperatorJourneyHeader.tsx", "utf8");
    expect(header).not.toMatch(/from ["']@\/services\/(?:api-fetch|bmoni-device|moniguard|banking|execution|money-plan|approval)["']/);
    expect(header).not.toMatch(/\b(?:fetch|runMoniGuard|approvePlan|signTransactionHash)\s*\(/);
  });
});
