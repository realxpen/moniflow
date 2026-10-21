import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { getReadOnlyFinancialContent } from "./read-only-financial-content";

describe("Figma v2 signed-in Pockets & Activity - financial data withheld", () => {
  it("treats unknown Pockets as unavailable, not zero allocations", () => {
    const pockets = getReadOnlyFinancialContent("pockets");
    expect(pockets.unavailableLabel).toBe("Not available yet");
    expect(pockets.unavailableExplanation).toMatch(/not a zero balance/i);
    expect(pockets.unavailableExplanation).not.toMatch(/₦0\b/);
    expect(pockets.explanations[0]?.description).toMatch(/not separate bank accounts/i);
    expect(pockets.practiceRoute).toBe("/learn/playground");
    expect(pockets.practiceDisclosure).toContain("NO REAL FUNDS");
  });

  it("treats unknown Activity as not fetched and never implies a completed transaction", () => {
    const activity = getReadOnlyFinancialContent("activity");
    expect(activity.unavailableLabel).toBe("Not available yet");
    expect(activity.unavailableExplanation).toMatch(/no provider-backed history has been fetched/i);
    expect(activity.unavailableExplanation).toMatch(/does not mean there are zero transactions/i);
    expect(activity.explanations.map(x => x.title)).toEqual([
      "Provider-confirmed movement",
      "Pocket allocation",
      "Processing"
    ]);
    expect(activity.explanations[0]?.description).toMatch(/only with evidence/i);
    expect(activity.explanations[2]?.description).toMatch(/never shown as completed/i);
    expect(activity.practiceRoute).toBe("/demo/walkthrough");
    expect(activity.practiceDisclosure).toContain("NO PROVIDER DATA");
  });

  it("keeps the production component presentational and educational routes separate", () => {
    const workspace = readFileSync("apps/mobile/components/AuthenticatedWorkspace.tsx", "utf8");
    const panel = readFileSync("apps/mobile/components/workspace/ReadOnlyFinancialPanel.tsx", "utf8");
    expect(workspace).toContain('tab === "pockets" || tab === "activity"');
    expect(workspace).toContain("<ReadOnlyFinancialPanel");
    expect(workspace).toContain('"/learn/playground"');
    expect(workspace).toContain('"/demo/walkthrough"');
    expect(panel).toContain("No financial balances or history are being fetched");
    expect(panel).not.toMatch(/from ["']@\/services\/(?:api-fetch|bmoni-device|banking|execution|money-plan|approval|wallet-dashboard|pockets|activity)["']/);
    expect(panel).not.toMatch(/\b(?:loadWallet|loadActivity|loadPockets|approvePlan|fetch)\s*\(/);
  });
});
