import { describe, expect, it } from "vitest";
import { buildReadinessJourney } from "./account-readiness-journey";
import type { AccountWorkspaceOverview } from "./account-workspace";
import type { AccountReconciliationReadiness } from "./account-reconciliation";

const me = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";

const workspace: AccountWorkspaceOverview = {
  authenticated: true, userId: me, mapping: "not_linked", wallet: "not_created",
  kyc: "not_checked", providerReadAccess: false, financialOperationsEnabled: false,
  accountData: "withheld_until_verified"
};
const reconciliation: AccountReconciliationReadiness = {
  authenticated: true, userId: me, mapping: "not_linked",
  reconciliation: "identity_evidence_required", identityEvidence: "not_collected",
  providerOwnershipVerified: false, automaticLinkingEnabled: false,
  financialOperationsEnabled: false
};

const status = (result: ReturnType<typeof buildReadinessJourney>, id: string) =>
  result.steps.find((step) => step.id === id)?.status;

function remainsLocked(result: ReturnType<typeof buildReadinessJourney>) {
  expect(result.financialOperationsEnabled).toBe(false);
  expect(result.automaticLinkingEnabled).toBe(false);
  expect(status(result, "financial")).toBe("WITHHELD");
  expect(status(result, "wallet")).not.toBe("VERIFIED SESSION");
  expect(status(result, "identity")).not.toBe("VERIFIED SESSION");
}

describe("read-only next-step policy for authenticated MONIFlow workspaces", () => {
  it("withholds all provider states without a verified workspace", () => {
    const result = buildReadinessJourney(null, null);
    expect(status(result, "session")).toBe("NOT VERIFIED");
    expect(status(result, "identity")).toBe("NOT VERIFIED");
    expect(status(result, "wallet")).toBe("NOT CHECKED");
    expect(result.nextActionTitle).toBe("Verify your signed-in workspace");
    expect(result.steps).toHaveLength(5);
    remainsLocked(result);
  });

  it("recognizes the signed-in session only, without treating it as BMONI ownership", () => {
    const result = buildReadinessJourney(workspace, reconciliation);
    expect(status(result, "session")).toBe("VERIFIED SESSION");
    expect(status(result, "identity")).toBe("EVIDENCE NEEDED");
    expect(status(result, "nigeria")).toBe("NOT CHECKED");
    expect(result.nextActionTitle).toBe("Await a provider-approved identity path");
    remainsLocked(result);
  });

  it("preserves unresolved provider conflicts as manual review with no auto-retry", () => {
    const result = buildReadinessJourney(workspace, {
      ...reconciliation, reconciliation: "manual_review_required"
    });
    expect(status(result, "identity")).toBe("MANUAL REVIEW");
    expect(result.nextActionDetail).toMatch(/Do not retry user creation/);
    remainsLocked(result);
  });

  it("does not mistake a locally recorded mapping or wallet for provider ownership", () => {
    const result = buildReadinessJourney(
      { ...workspace, mapping: "recorded", wallet: "recorded_not_reverified" },
      { ...reconciliation, mapping: "recorded_unverified", reconciliation: "unverified_mapping" }
    );
    expect(status(result, "identity")).toBe("RECORDED ONLY");
    expect(status(result, "wallet")).toBe("NOT REVERIFIED");
    expect(result.nextActionTitle).toBe("Obtain independent ownership evidence");
    remainsLocked(result);
  });

  it("fails closed if the identity review route is absent, mismatched, or inflated", () => {
    for (const candidate of [
      null,
      { ...reconciliation, userId: other },
      { ...reconciliation, mapping: "recorded_unverified" as const },
      { ...reconciliation, reconciliation: "unverified_mapping" as const },
      { ...reconciliation, identityEvidence: "verified" },
      { ...reconciliation, providerOwnershipVerified: true },
      { ...reconciliation, financialOperationsEnabled: true },
      { ...reconciliation, automaticLinkingEnabled: true },
      { ...reconciliation, authenticated: false }
    ]) {
      const result = buildReadinessJourney(workspace, candidate as AccountReconciliationReadiness | null);
      expect(status(result, "identity")).toBe("NOT VERIFIED");
      expect(result.nextActionTitle).toBe("Review identity status when available");
      remainsLocked(result);
    }
  });

  it("rejects inflated workspace permissions and impossible wallet states", () => {
    for (const candidate of [
      { ...workspace, providerReadAccess: true },
      { ...workspace, financialOperationsEnabled: true },
      { ...workspace, kyc: "complete" },
      { ...workspace, mapping: "not_linked", wallet: "recorded_not_reverified" },
      { ...workspace, accountData: "ready" }
    ]) {
      const result = buildReadinessJourney(candidate as AccountWorkspaceOverview, reconciliation);
      expect(status(result, "session")).toBe("NOT VERIFIED");
      expect(status(result, "identity")).toBe("NOT VERIFIED");
      remainsLocked(result);
    }
  });

  it("never suggests provider wallet or funds actions when no reconciliation is available", () => {
    const result = buildReadinessJourney(
      { ...workspace, mapping: "recorded", wallet: "recorded_not_reverified" }, null
    );
    expect(status(result, "identity")).toBe("NOT VERIFIED");
    expect(status(result, "wallet")).toBe("NOT REVERIFIED");
    expect(result.nextActionDetail).toMatch(/missing or inconsistent/);
    remainsLocked(result);
  });
});
