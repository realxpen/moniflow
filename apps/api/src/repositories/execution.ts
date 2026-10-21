export type ExecutionState = "PREPARING" | "AWAITING_DEVICE_SIGNATURE" | "PROCESSING" | "COMPLETED" | "FAILED";

export type ProviderExecution = {
  planId: string;
  localUserId: string;
  providerProposalId: string;
  providerBankAccountId: string;
  amount: number;
  currency: "NGN";
  signHash: string | null;
  providerStatus: string | null;
  state: ExecutionState;
  createdAt: string;
  updatedAt: string;
};

export interface ExecutionRepository {
  findByPlanId(planId: string, localUserId: string): Promise<ProviderExecution | null>;
  create(value: ProviderExecution): Promise<ProviderExecution>;
  update(value: ProviderExecution): Promise<ProviderExecution>;
  /** Atomic, database-backed claim. Only one caller can ever claim a plan. */
  claimPreparation(input: PreparationHoldInput): Promise<boolean>;
  findPreparationHold(planId: string, localUserId: string): Promise<PreparationHold | null>;
  recordPreparationOutcome(planId: string, localUserId: string, state: Exclude<PreparationHoldState, "RESERVED">, proposalId?: string | null): Promise<void>;
  close(): Promise<void>;
}

/**
 * Durable no-auto-retry preparation hold. A hold is written before calling the
 * financial provider; it can NEVER be released and replayed automatically.
 * A crash or unclear provider response needs independent reconciliation.
 */
export type PreparationHoldState = "RESERVED" | "PROVIDER_OUTCOME_UNKNOWN" | "PROPOSAL_RECORDED";
export type PreparationHold = {
  planId: string;
  localUserId: string;
  approvedPlanHash: string;
  providerBankAccountId: string;
  amount: number;
  state: PreparationHoldState;
  providerProposalId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PreparationHoldInput = Pick<
  PreparationHold,
  "planId" | "localUserId" | "approvedPlanHash" | "providerBankAccountId" | "amount"
>;
