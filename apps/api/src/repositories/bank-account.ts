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
