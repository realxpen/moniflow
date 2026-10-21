import type { AccountWorkspaceOverview } from "./account-workspace";
import type { AccountReconciliationReadiness } from "./account-reconciliation";

export type JourneyStatus =
  | "VERIFIED SESSION"
  | "NOT VERIFIED"
  | "EVIDENCE NEEDED"
  | "RECORDED ONLY"
  | "MANUAL REVIEW"
  | "NOT REVERIFIED"
  | "NOT CHECKED"
  | "WITHHELD";

export type ReadinessJourneyStep = {
  id: "session" | "identity" | "wallet" | "nigeria" | "financial";
  title: string;
  status: JourneyStatus;
  detail: string;
};

export type ReadinessJourney = {
  nextActionTitle: string;
  nextActionDetail: string;
  steps: ReadonlyArray<ReadinessJourneyStep>;
  financialOperationsEnabled: false;
  automaticLinkingEnabled: false;
};

/**
 * Read-only presentation policy. Inputs must already have passed the
 * authenticated owner-scoped API validators. This function does not fetch,
 * infer a BMONI ID, link identities, or unlock any provider operation.
 */
export function buildReadinessJourney(
  workspace: AccountWorkspaceOverview | null,
  reconciliation: AccountReconciliationReadiness | null
): ReadinessJourney {
  const validWorkspace = workspace?.authenticated === true &&
    workspace.providerReadAccess === false &&
    workspace.financialOperationsEnabled === false &&
    workspace.accountData === "withheld_until_verified" &&
    workspace.kyc === "not_checked" &&
    (workspace.mapping === "not_linked" || workspace.mapping === "recorded") &&
    (workspace.wallet === "not_created" || workspace.wallet === "recorded_not_reverified") &&
    (workspace.mapping !== "not_linked" || workspace.wallet === "not_created");

  const trustedWorkspace = validWorkspace ? workspace : null;
  const expectedMapping = trustedWorkspace?.mapping === "recorded" ? "recorded_unverified" : "not_linked";
  const review = trustedWorkspace &&
    reconciliation?.authenticated === true &&
    reconciliation.userId.toLowerCase() === trustedWorkspace.userId.toLowerCase() &&
    reconciliation.mapping === expectedMapping &&
    reconciliation.identityEvidence === "not_collected" &&
    reconciliation.providerOwnershipVerified === false &&
    reconciliation.automaticLinkingEnabled === false &&
    reconciliation.financialOperationsEnabled === false &&
    (
      (reconciliation.reconciliation === "identity_evidence_required" && expectedMapping === "not_linked") ||
      (reconciliation.reconciliation === "unverified_mapping" && expectedMapping === "recorded_unverified") ||
      reconciliation.reconciliation === "manual_review_required"
    )
      ? reconciliation.reconciliation : null;

  const identityStatus: JourneyStatus = review === "manual_review_required" ? "MANUAL REVIEW" :
    review === "unverified_mapping" ? "RECORDED ONLY" :
    review === "identity_evidence_required" ? "EVIDENCE NEEDED" : "NOT VERIFIED";

  const action = !trustedWorkspace
    ? {
        title: "Verify your signed-in workspace",
        detail: "Refresh account status when your connection is available. No provider data is shown without an authenticated owner-scoped response."
      }
    : review === "manual_review_required"
      ? {
          title: "Pause for manual identity review",
          detail: "An unresolved provisioning hold needs independent investigation through an approved channel. Do not retry user creation or automatically link a BMONI account."
        }
      : review === "unverified_mapping"
        ? {
            title: "Obtain independent ownership evidence",
            detail: "The recorded local mapping is not proof of BMONI account ownership. Provider-approved identity evidence and a supported physical device are required before any later wallet proof."
          }
        : review === "identity_evidence_required"
          ? {
              title: "Await a provider-approved identity path",
              detail: "No BMONI identity is linked. Do not claim a public test identity, submit personal documents here, or create a wallet until an approved verification process exists."
            }
          : {
              title: "Review identity status when available",
              detail: "The identity review response is missing or inconsistent. Refresh later; no automatic linking, retry or financial access can follow from an unverified status."
            };

  return {
    nextActionTitle: action.title,
    nextActionDetail: action.detail,
    financialOperationsEnabled: false,
    automaticLinkingEnabled: false,
    steps: [
      {
        id: "session",
        title: "MONIFlow account access",
        status: trustedWorkspace ? "VERIFIED SESSION" : "NOT VERIFIED",
        detail: trustedWorkspace
          ? "Your signed-in MONIFlow subject matches the account workspace. This does not verify BMONI identity."
          : "An authenticated, owner-scoped workspace response has not been confirmed."
      },
      {
        id: "identity",
        title: "BMONI identity review",
        status: identityStatus,
        detail: review === "manual_review_required"
          ? "A local provisioning hold requires independent manual review; no automatic retry is permitted."
          : review === "unverified_mapping"
            ? "A mapping is recorded locally. Independent BMONI ownership evidence is still missing."
            : review === "identity_evidence_required"
              ? "No identity mapping exists for this account; approved evidence is needed."
              : "Identity readiness cannot be confirmed from the current response."
      },
      {
        id: "wallet",
        title: "Device wallet ownership",
        status: trustedWorkspace?.wallet === "recorded_not_reverified" ? "NOT REVERIFIED" : "NOT CHECKED",
        detail: trustedWorkspace?.wallet === "recorded_not_reverified"
          ? "A local wallet record exists, but the device owner key has not been reverified."
          : "No supported-device ownership proof has been verified for this account."
      },
      {
        id: "nigeria",
        title: "Nigeria onboarding and KYC",
        status: "NOT CHECKED",
        detail: "Provider-approved KYC and Nigerian rail readiness have not been checked."
      },
      {
        id: "financial",
        title: "Provider balances and activity",
        status: "WITHHELD",
        detail: "No financial data may be displayed until ownership, KYC, and provider read permission are independently verified."
      }
    ]
  };
}
