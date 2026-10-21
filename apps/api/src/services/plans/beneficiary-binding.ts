import type { BankAccountRepository, VerifiedBankAccount } from "../../repositories/bank-account.js";
import { normalizeBankLabel } from "../../repositories/bank-account.js";
import type { MoneyPlan, MoneyPlanAction } from "../../schemas/money-plan.js";
import { moneyPlanSchema } from "../../schemas/money-plan.js";

export type WithdrawalAction = Extract<MoneyPlanAction, { kind: "BANK_WITHDRAWAL" }>;

/**
 * This snapshot is part of the approved Money Plan and its fingerprint.
 * It can only be sourced from a verified account in the owner's repository.
 */
export async function bindVerifiedPlanDestinations(
  plan: MoneyPlan,
  localUserId: string,
  repository: BankAccountRepository
): Promise<MoneyPlan> {
  const actions: MoneyPlanAction[] = [];
  for (const action of plan.actions) {
    if (action.kind !== "BANK_WITHDRAWAL") {
      actions.push(action);
      continue;
    }
    const account = await repository.findVerifiedByLabel(localUserId, action.label);
    if (!account) {
      actions.push(action);
      continue;
    }
    actions.push({
      ...action,
      destinationBinding: {
        providerAccountId: account.providerAccountId,
        bankCode: account.bankCode,
        bankName: account.bankName,
        maskedAccountNumber: account.maskedAccountNumber,
        accountHolderName: account.accountHolderName
      }
    });
  }
  return moneyPlanSchema.parse({ ...plan, actions });
}

/**
 * Fail closed for missing (legacy) binding, changed aliases, a mismatched
 * provider account, or changed bank identity. Never silently rebind a plan.
 */
export function matchesReviewedDestination(
  action: WithdrawalAction,
  account: VerifiedBankAccount | null,
  localUserId: string
): boolean {
  const bound = action.destinationBinding;
  return Boolean(
    bound &&
    account?.verified === true &&
    account.localUserId.toLowerCase() === localUserId.toLowerCase() &&
    normalizeBankLabel(account.label) === normalizeBankLabel(action.label) &&
    bound.providerAccountId === account.providerAccountId &&
    bound.bankCode === account.bankCode &&
    bound.bankName === account.bankName &&
    bound.maskedAccountNumber === account.maskedAccountNumber &&
    bound.accountHolderName === account.accountHolderName
  );
}

/** Includes both current verified registry ownership and immutable plan seal. */
export async function getReviewedDestination(
  action: WithdrawalAction,
  localUserId: string,
  repository: BankAccountRepository
): Promise<VerifiedBankAccount | null> {
  if (!action.destinationBinding) return null;
  const account = await repository.findVerifiedByLabel(localUserId, action.label);
  return matchesReviewedDestination(action, account, localUserId) ? account : null;
}
