export type FinancialRecoveryState =
  | "LEGACY_UNKNOWN_COMMITMENT"
  | "LOCAL_RECORD_MISMATCH"
  | "PROVIDER_OUTCOME_UNKNOWN"
  | "PREPARATION_UNCONFIRMED"
  | "LOCAL_PROPOSAL_RECORDED"
  | "LOCAL_COMPLETION_RECORDED";

export type FinancialRecoverySnapshot = {
  authenticated: true;
  userId: string;
  evidenceSource: "LOCAL_RECORDS_ONLY";
  providerEvidenceChecked: false;
  financialOperationsEnabled: false;
  automaticReleaseAllowed: false;
  automaticRetryAllowed: false;
  visibleCaseCount: number;
  hasMore: boolean;
  cases: Array<{
    planId: string;
    recordedAt: string;
    state: FinancialRecoveryState;
    manualReviewRequired: true;
    automaticRetryAllowed: false;
    automaticReleaseAllowed: false;
  }>;
};

const recognized = new Set<FinancialRecoveryState>([
  "LEGACY_UNKNOWN_COMMITMENT", "LOCAL_RECORD_MISMATCH", "PROVIDER_OUTCOME_UNKNOWN",
  "PREPARATION_UNCONFIRMED", "LOCAL_PROPOSAL_RECORDED", "LOCAL_COMPLETION_RECORDED"
]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Reject owner switches and any server flags suggesting funds are free or verified. */
export function validateFinancialRecoveryPayload(payload: unknown, expectedSubject: string): FinancialRecoverySnapshot {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid local recovery response.");
  }
  const data = payload as Partial<FinancialRecoverySnapshot>;
  const items = data.cases;
  if (data.authenticated !== true || typeof data.userId !== "string" ||
      data.userId.toLowerCase() !== expectedSubject.toLowerCase() ||
      data.evidenceSource !== "LOCAL_RECORDS_ONLY" ||
      data.providerEvidenceChecked !== false || data.financialOperationsEnabled !== false ||
      data.automaticReleaseAllowed !== false || data.automaticRetryAllowed !== false ||
      !Array.isArray(items) || items.length > 25 ||
      !Number.isSafeInteger(data.visibleCaseCount) ||
      data.visibleCaseCount !== items.length || typeof data.hasMore !== "boolean" ||
      items.some(item => !item || typeof item !== "object" || !uuid.test(item.planId) ||
        typeof item.recordedAt !== "string" || !Number.isFinite(Date.parse(item.recordedAt)) ||
        !recognized.has(item.state) || item.manualReviewRequired !== true ||
        item.automaticRetryAllowed !== false || item.automaticReleaseAllowed !== false)) {
    throw new Error("Recovery records did not match this authenticated account or the read-only safety contract.");
  }
  return data as FinancialRecoverySnapshot;
}

export const financialRecoveryDescriptions: Record<FinancialRecoveryState, { title: string; detail: string }> = {
  LEGACY_UNKNOWN_COMMITMENT: {
    title: "Historical reservation — amount unknown",
    detail: "This older record predates commitment tracking. An authorized reviewer must reconcile it."
  },
  LOCAL_RECORD_MISMATCH: {
    title: "Local records do not agree",
    detail: "Stored plan, approval, destination or execution details conflict. No completion is assumed."
  },
  PROVIDER_OUTCOME_UNKNOWN: {
    title: "Provider outcome unknown",
    detail: "A provider attempt may have occurred, but the locally recorded outcome is inconclusive."
  },
  PREPARATION_UNCONFIRMED: {
    title: "Preparation not confirmed",
    detail: "The server reserved this plan but did not record an independently confirmed proposal outcome."
  },
  LOCAL_PROPOSAL_RECORDED: {
    title: "Proposal recorded locally",
    detail: "A local proposal record exists; this does not verify provider settlement."
  },
  LOCAL_COMPLETION_RECORDED: {
    title: "Completion recorded locally",
    detail: "Local bookkeeping reports completion. Independent provider evidence was not checked here."
  }
};
