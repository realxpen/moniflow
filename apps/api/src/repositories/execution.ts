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
  /**
   * Atomically reserve an entire plan commitment against a fresh spendable
   * ceiling, including OTHER already submitted plans owned by this user.
   * Unknown or completed proposals remain reserved until a separately
   * reviewed reconciliation protocol exists; never release on a timeout.
   */
  claimSpendablePreparation(input: SpendablePreparationInput): Promise<SpendableClaimResult>;
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

export type SpendablePreparationInput = PreparationHoldInput & {
  /** Withdrawal plus pocket allocations, positive NGN including 2 decimals. */
  reservedAmount: number;
  /** Fresh provider available minus already allocated pockets. */
  spendableCeiling: number;
};
export type SpendableClaimResult =
  | "CLAIMED" | "CONFLICT" | "INSUFFICIENT_CAPACITY" | "UNRECONCILED_LEGACY";

/** Exact cents for safe cross-plan comparisons. */
export function moneyInCents(value: number): number {
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100)) ||
      Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) {
    throw new Error("Amounts must be finite nonnegative money with at most two decimals.");
  }
  return Math.round(value * 100);
}
