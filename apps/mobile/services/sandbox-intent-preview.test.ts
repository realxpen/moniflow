import { describe, expect, it } from "vitest";

import { initialSandboxWorkspace } from "../../api/src/services/sandbox-demo/state";
import { previewSandboxIntent } from "../../api/src/services/sandbox-demo/intent-preview";
import { parseSandboxIntentPreview } from "./sandbox-intent-preview-validation";

const owner = "e8e5e2d1-9031-41e3-92cb-d6e8935b62c9";
const state = () => initialSandboxWorkspace(owner);

describe("authenticated simulated intent lab API contract", () => {
  it("reads the real parser and Guard preview without authorizing or changing anything", () => {
    const before = state();
    const response = previewSandboxIntent(before,
      "Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop");
    expect(parseSandboxIntentPreview(response)).toMatchObject({
      localUserId: owner, simulated: true, realFundsMoved: false, previewOnly: true,
      status: "PREVIEW", verdict: "REVIEW",
      totals: { availableAfter: 240000, externalMovement: 40000, internalAllocation: 20000 }
    });
    expect(before.plan).toBeNull();
    expect(before.activity).toHaveLength(0);
  });

  it("blocks overspending and never treats two external bank movements as approved", () => {
    const overspend = parseSandboxIntentPreview(previewSandboxIntent(state(),
      "Withdraw ₦400k to GTBank"));
    const multiple = parseSandboxIntentPreview(previewSandboxIntent(state(),
      "Withdraw ₦10k to GTBank and withdraw ₦20k to Access Bank"));
    expect(overspend.status === "PREVIEW" && overspend.verdict).toBe("BLOCK");
    expect(multiple.status === "PREVIEW" && multiple.verdict).toBe("BLOCK");
    expect(parseSandboxIntentPreview(previewSandboxIntent(state(),
      "Send ₦10,000 to a stranger")).status).toBe("UNSUPPORTED");
  });

  it("rejects contradictory calculations, fake settlement and wrong providers", () => {
    const actual = previewSandboxIntent(state(), "Save ₦20k for laptop");
    if (actual.status !== "PREVIEW") throw new Error("Unexpected fixture");
    for (const fake of [
      { ...actual, realFundsMoved: true },
      { ...actual, simulated: false },
      { ...actual, provider: "bmoni" },
      { ...actual, totals: { ...actual.totals, availableAfter: 300000 } },
      { ...actual, checks: [] },
      { ...actual, status: "COMPLETED" },
      { ...actual, actions: [{ ...actual.actions[0], index: 2 }] }
    ]) {
      expect(() => parseSandboxIntentPreview(fake)).toThrow();
    }
  });
});
