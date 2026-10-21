import { describe, expect, it } from "vitest";
import { canApplyOwnerRequest, selectVisibleOwnerSnapshot, type OwnerWorkspaceSnapshot } from "./owner-workspace-snapshot";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const workspace = {
  authenticated: true as const, userId: alice, mapping: "not_linked" as const,
  wallet: "not_created" as const, kyc: "not_checked" as const,
  providerReadAccess: false as const, financialOperationsEnabled: false as const,
  accountData: "withheld_until_verified" as const
};
const review = {
  authenticated: true as const, userId: alice, mapping: "not_linked" as const,
  reconciliation: "identity_evidence_required" as const, identityEvidence: "not_collected" as const,
  providerOwnershipVerified: false as const, automaticLinkingEnabled: false as const,
  financialOperationsEnabled: false as const
};
const snapshot: OwnerWorkspaceSnapshot = {
  subjectId: alice, busy: false, overview: workspace, reconciliation: review,
  error: null, reconciliationError: null
};

describe("Phase 33C: active account render fence", () => {
  it("displays read-only readiness only for the matching signed-in subject", () => {
    expect(selectVisibleOwnerSnapshot(alice, snapshot)).toEqual(snapshot);
    expect(selectVisibleOwnerSnapshot(alice.toUpperCase(), snapshot)).toEqual(snapshot);
  });

  it("drops every previous account field at sign-out, not only the workspace details", () => {
    const old: OwnerWorkspaceSnapshot = {
      ...snapshot, busy: true, error: "old account error", reconciliationError: "old review error"
    };
    expect(selectVisibleOwnerSnapshot(null, old)).toBeNull();
    expect(selectVisibleOwnerSnapshot("", old)).toBeNull();
    expect(selectVisibleOwnerSnapshot(undefined, old)).toBeNull();
  });

  it("does not flash another user's workspace, reconciliation or error during account switch", () => {
    const old: OwnerWorkspaceSnapshot = {
      ...snapshot, error: "private support reference", reconciliationError: "private review status"
    };
    expect(selectVisibleOwnerSnapshot(bob, old)).toBeNull();
  });

  it("rejects an incorrectly tagged workspace even if its snapshot subject matches", () => {
    const untrusted = { ...snapshot, overview: { ...workspace, userId: bob } };
    expect(selectVisibleOwnerSnapshot(alice, untrusted)).toBeNull();
  });

  it("fails closed on inflated financial permissions and impossible wallet readiness", () => {
    for (const invalid of [
      { ...workspace, providerReadAccess: true },
      { ...workspace, financialOperationsEnabled: true },
      { ...workspace, accountData: "ready" },
      { ...workspace, kyc: "verified" },
      { ...workspace, mapping: "not_linked", wallet: "recorded_not_reverified" }
    ]) {
      expect(selectVisibleOwnerSnapshot(alice, {
        ...snapshot, overview: invalid as OwnerWorkspaceSnapshot["overview"]
      })).toBeNull();
    }
  });

  it("preserves verified local workspace while withholding foreign reconciliation details", () => {
    const viewed = selectVisibleOwnerSnapshot(alice, {
      ...snapshot, reconciliation: { ...review, userId: bob }
    });
    expect(viewed?.overview).toEqual(workspace);
    expect(viewed?.reconciliation).toBeNull();
    expect(viewed?.reconciliationError).toBe("Identity review could not be verified for this signed-in account.");
  });

  it("blocks reconciliation status if missing workspace, contradictory mapping, or permission escalation", () => {
    for (const broken of [
      { ...snapshot, overview: null },
      { ...snapshot, reconciliation: { ...review, mapping: "recorded_unverified" as const } },
      { ...snapshot, reconciliation: { ...review, providerOwnershipVerified: true } },
      { ...snapshot, reconciliation: { ...review, automaticLinkingEnabled: true } },
      { ...snapshot, reconciliation: { ...review, financialOperationsEnabled: true } },
      { ...snapshot, reconciliation: { ...review, reconciliation: "unverified_mapping" as const } }
    ]) {
      const result = selectVisibleOwnerSnapshot(alice, broken as OwnerWorkspaceSnapshot);
      expect(result?.reconciliation).toBeNull();
    }
  });

  it("accepts only the newest request from the still-active account", () => {
    expect(canApplyOwnerRequest(alice, alice, 4, 4)).toBe(true);
    expect(canApplyOwnerRequest(alice, bob, 4, 4)).toBe(false);
    expect(canApplyOwnerRequest(alice, null, 4, 4)).toBe(false);
    expect(canApplyOwnerRequest(alice, alice, 3, 4)).toBe(false);
    expect(canApplyOwnerRequest(alice, alice, 5, 4)).toBe(false);
    expect(canApplyOwnerRequest(alice, alice.toUpperCase(), 4, 4)).toBe(true);
  });
});
