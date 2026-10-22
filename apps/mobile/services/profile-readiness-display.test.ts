import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildReadinessJourney } from "./account-readiness-journey";
import { profileEvidenceTone, profileSessionBadge } from "./profile-readiness-display";
import type { AccountWorkspaceOverview } from "./account-workspace";
import type { AccountReconciliationReadiness } from "./account-reconciliation";

const owner = "11111111-1111-4111-8111-111111111111";
const workspace: AccountWorkspaceOverview = {
  authenticated: true,
  userId: owner,
  mapping: "not_linked",
  wallet: "not_created",
  kyc: "not_checked",
  providerReadAccess: false,
  financialOperationsEnabled: false,
  accountData: "withheld_until_verified"
};
const identity: AccountReconciliationReadiness = {
  authenticated: true,
  userId: owner,
  mapping: "not_linked",
  reconciliation: "identity_evidence_required",
  identityEvidence: "not_collected",
  providerOwnershipVerified: false,
  automaticLinkingEnabled: false,
  financialOperationsEnabled: false
};

describe("Figma v3 Profile - bounded read-only readiness", () => {
  it("never implies BMONI wallet verification from a MONIFlow session", () => {
    const journey = buildReadinessJourney(workspace, identity);
    expect(profileSessionBadge(journey, false)).toEqual({
      label: "MONIFLOW SESSION CHECKED",
      tone: "processing"
    });
    expect(journey.steps.find(s => s.id === "identity")?.status).toBe("EVIDENCE NEEDED");
    expect(journey.steps.find(s => s.id === "financial")?.status).toBe("WITHHELD");
    expect(profileSessionBadge(journey, true).label).toBe("CHECKING MONIFLOW SESSION");
    expect(journey.financialOperationsEnabled).toBe(false);
    expect(journey.automaticLinkingEnabled).toBe(false);
  });

  it("fails closed when no owner-scoped workspace is available", () => {
    const journey = buildReadinessJourney(null, null);
    expect(profileSessionBadge(journey, false)).toEqual({
      label: "SESSION NOT VERIFIED",
      tone: "warning"
    });
    expect(journey.steps.find(s => s.id === "session")?.status).toBe("NOT VERIFIED");
  });

  it("marks manual review as caution, not as verified financial readiness", () => {
    const journey = buildReadinessJourney(workspace, {
      ...identity,
      reconciliation: "manual_review_required"
    });
    expect(profileEvidenceTone("MANUAL REVIEW")).toBe("warning");
    expect(profileEvidenceTone("RECORDED ONLY")).toBe("warning");
    expect(profileEvidenceTone("NOT REVERIFIED")).toBe("warning");
    expect(profileEvidenceTone("WITHHELD")).toBe("warning");
    expect(profileEvidenceTone("VERIFIED SESSION")).toBe("processing");
    expect(journey.nextActionDetail).toMatch(/Do not retry user creation/);
    expect(journey.financialOperationsEnabled).toBe(false);
  });

  it("keeps owner-scoped account data source and existing safe controls intact", () => {
    const workspaceSource = readFileSync("apps/mobile/components/AuthenticatedWorkspace.tsx", "utf8");
    const panel = readFileSync("apps/mobile/components/workspace/ProfileReadinessPanel.tsx", "utf8");
    expect(workspaceSource).toContain("selectVisibleOwnerSnapshot(auth?.userId, snapshot)");
    expect(workspaceSource).toContain('tab === "home" ? (');
    expect(workspaceSource).toContain('tab === "pockets" || tab === "activity"');
    expect(workspaceSource).toContain('router.push("/(tabs)/profile")');
    expect(workspaceSource).toContain("<ProfileReadinessPanel");
    expect(workspaceSource).toContain("journey={journey}");
    expect(workspaceSource).toContain('router.push("/auth/session")');
    expect(workspaceSource).toContain("onSignOut={leave}");
    expect(panel).toContain("READ-ONLY · NO AUTOMATIC LINKING · NO FINANCIAL OPERATIONS");
    expect(panel).not.toMatch(/from ["']@\/services\/(?:api-fetch|bmoni-device|banking|execution|money-plan|approval|wallet-dashboard)["']/);
    expect(panel).not.toMatch(/\b(?:fetch|loadWallet|approvePlan|signTransactionHash)\s*\(/);
  });
});
