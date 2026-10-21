export type VerifiedBankAccount = {
  id: string;
  localUserId: string;
  label: string;
  providerAccountId: string;
  bankCode: string;
  bankName: string;
  maskedAccountNumber: string;
  accountHolderName: string;
  verified: true;
  createdAt: string;
  updatedAt: string;
};

export interface BankAccountRepository {
  findVerifiedByLabel(localUserId: string, label: string): Promise<VerifiedBankAccount | null>;
  findVerifiedByProviderId(localUserId: string, providerAccountId: string): Promise<VerifiedBankAccount | null>;
  saveVerified(account: VerifiedBankAccount): Promise<VerifiedBankAccount>;
  close(): Promise<void>;
}

export function normalizeBankLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Human-reviewed Money Plans refer to destination labels. Once a label is
 * verified, it must never silently resolve to another provider beneficiary.
 * A different destination needs a NEW label and a fresh Money Plan review.
 */
export class BankDestinationLabelConflictError extends Error {
  override readonly name = "BankDestinationLabelConflictError";
  readonly code = "BANK_DESTINATION_LABEL_CONFLICT" as const;
  constructor() {
    super("Saved bank label is already bound to a verified destination. Use a new label and review a new Money Plan.");
  }
}

export function sameVerifiedBankDestination(a: VerifiedBankAccount, b: VerifiedBankAccount): boolean {
  return a.localUserId === b.localUserId &&
    normalizeBankLabel(a.label) === normalizeBankLabel(b.label) &&
    a.providerAccountId === b.providerAccountId &&
    a.bankCode === b.bankCode &&
    a.bankName === b.bankName &&
    a.maskedAccountNumber === b.maskedAccountNumber &&
    a.accountHolderName === b.accountHolderName;
}
