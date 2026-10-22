import type { PreparationHold, ProviderExecution } from "../../repositories/execution.js";
import { moneyInCents } from "../../repositories/execution.js";
import type { PersistedMoneyPlan } from "../../repositories/money-plan.js";
import { fingerprintMoneyPlan } from "./approval.js";

export type RecoveryCaseState =
  | "LEGACY_UNKNOWN_COMMITMENT"
  | "LOCAL_RECORD_MISMATCH"
  | "PROVIDER_OUTCOME_UNKNOWN"
  | "PREPARATION_UNCONFIRMED"
  | "LOCAL_PROPOSAL_RECORDED"
  | "LOCAL_COMPLETION_RECORDED";

export type FinancialRecoveryCase = {
  planId: string;
  state: RecoveryCaseState;
  recordedAt: string;
  manualReviewRequired: true;
  automaticRetryAllowed: false;
  automaticReleaseAllowed: false;
};

/**
 * Classifies ONLY persisted local evidence. Never infer provider confirmation,
 * final settlement or fund-release authority from these rows.
 *
 * No provider account ID, amount, customer name, raw provider payload,
 * bearer token or signing material may be returned to the mobile client.
 */
export function classifyLocalFinancialRecovery(
  hold: PreparationHold,
  plan: PersistedMoneyPlan | null,
  execution: ProviderExecution | null
): FinancialRecoveryCase {
  let state: RecoveryCaseState;
  if (hold.reservedAmount === null) {
    state = "LEGACY_UNKNOWN_COMMITMENT";
  } else {
    const withdrawal = plan?.plan.actions.filter(a => a.kind === "BANK_WITHDRAWAL");
    const action = withdrawal?.length === 1 ? withdrawal[0] : undefined;
    const currentHash = plan ? fingerprintMoneyPlan(plan.plan) : null;
    const allowed = new Set([
      "APPROVED", "EXECUTING", "AWAITING_DEVICE_SIGNATURE", "PROCESSING", "COMPLETED"
    ]);
    const inconsistent = !plan || plan.id !== hold.planId || plan.localUserId !== hold.localUserId ||
      !allowed.has(plan.status) || currentHash !== hold.approvedPlanHash ||
      plan.approvedPlanHash !== hold.approvedPlanHash || plan.planHash !== hold.approvedPlanHash ||
      !action || action.destinationBinding?.providerAccountId !== hold.providerBankAccountId ||
      moneyInCents(action.amount) !== moneyInCents(hold.amount) ||
      moneyInCents(plan.plan.totals.totalCommitted) !== moneyInCents(hold.reservedAmount) ||
      (execution && (
        execution.localUserId !== hold.localUserId || execution.planId !== hold.planId ||
        execution.providerBankAccountId !== hold.providerBankAccountId ||
        execution.currency !== plan.plan.currency ||
        moneyInCents(execution.amount) !== moneyInCents(hold.amount)
      )) ||
      (hold.state === "PROPOSAL_RECORDED" && (
        !hold.providerProposalId || !execution ||
        execution.providerProposalId !== hold.providerProposalId
      )) ||
      (hold.state === "RESERVED" && !!execution && !hold.providerProposalId) ||
      (hold.state === "PROVIDER_OUTCOME_UNKNOWN" && !!execution &&
        !!hold.providerProposalId && execution.providerProposalId !== hold.providerProposalId);

    if (inconsistent) state = "LOCAL_RECORD_MISMATCH";
    else if (hold.state === "PROVIDER_OUTCOME_UNKNOWN") state = "PROVIDER_OUTCOME_UNKNOWN";
    else if (hold.state === "RESERVED") state = "PREPARATION_UNCONFIRMED";
    else if (execution?.state === "COMPLETED") state = "LOCAL_COMPLETION_RECORDED";
    else state = "LOCAL_PROPOSAL_RECORDED";
  }
  return {
    planId: hold.planId,
    state,
    recordedAt: hold.createdAt,
    manualReviewRequired: true,
    automaticRetryAllowed: false,
    automaticReleaseAllowed: false
  };
}
