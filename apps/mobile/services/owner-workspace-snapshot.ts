import type { AccountWorkspaceOverview } from "./account-workspace";
import type { AccountReconciliationReadiness } from "./account-reconciliation";

/**
 * An entire read-only workspace response belongs to exactly one sign-in subject.
 * Never persist this state to disk. It is invalidated on navigation, sign-out,
 * account switch, or a newer fetch.
 */
export type OwnerWorkspaceSnapshot = {
  subjectId: string;
  busy: boolean;
  overview: AccountWorkspaceOverview | null;
  reconciliation: AccountReconciliationReadiness | null;
  error: string | null;
  reconciliationError: string | null;
};

function sameOwner(left: string | null | undefined, right: string | null | undefined): boolean {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

/**
 * Render-time fence: React can render once with a new auth subject before
 * effects have cleared the previous account's asynchronous local state.
 *
 * Always gate every piece of owner-scoped UI data, including support errors
 * and reconciliation status. A verified MONIFlow session alone does not prove
 * ownership of any BMONI account or wallet.
 */
export function selectVisibleOwnerSnapshot(
  signedInSubject: string | null | undefined,
  snapshot: OwnerWorkspaceSnapshot | null
): OwnerWorkspaceSnapshot | null {
  if (!snapshot || !sameOwner(signedInSubject, snapshot.subjectId)) return null;

  const overview = snapshot.overview;
  if (overview && (
    overview.authenticated !== true ||
    !sameOwner(signedInSubject, overview.userId) ||
    overview.providerReadAccess !== false ||
    overview.financialOperationsEnabled !== false ||
    overview.accountData !== "withheld_until_verified" ||
    overview.kyc !== "not_checked" ||
    !["recorded", "not_linked"].includes(overview.mapping) ||
    !["not_created", "recorded_not_reverified"].includes(overview.wallet) ||
    (overview.mapping === "not_linked" && overview.wallet !== "not_created")
  )) return null;

  const reconciliation = snapshot.reconciliation;
  if (!reconciliation) return snapshot;
  const expectedMapping = overview?.mapping === "recorded" ? "recorded_unverified" : "not_linked";
  const validReconciliation = Boolean(overview &&
    reconciliation.authenticated === true &&
    sameOwner(signedInSubject, reconciliation.userId) &&
    reconciliation.mapping === expectedMapping &&
    reconciliation.identityEvidence === "not_collected" &&
    reconciliation.providerOwnershipVerified === false &&
    reconciliation.automaticLinkingEnabled === false &&
    reconciliation.financialOperationsEnabled === false &&
    (
      reconciliation.reconciliation === "manual_review_required" ||
      (reconciliation.reconciliation === "identity_evidence_required" && expectedMapping === "not_linked") ||
      (reconciliation.reconciliation === "unverified_mapping" && expectedMapping === "recorded_unverified")
    ));
  if (!validReconciliation) {
    return {
      ...snapshot,
      reconciliation: null,
      reconciliationError: "Identity review could not be verified for this signed-in account."
    };
  }
  return snapshot;
}

/** A completed request cannot install a snapshot for an obsolete session. */
export function canApplyOwnerRequest(
  requestedSubject: string,
  activeSubject: string | null | undefined,
  requestedVersion: number,
  currentVersion: number
): boolean {
  return requestedVersion === currentVersion && sameOwner(requestedSubject, activeSubject);
}
