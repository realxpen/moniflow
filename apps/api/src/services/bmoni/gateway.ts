import type {
  BmoniUser,
  BvnLookup,
  CreateBmoniUserInput,
  CreateManagedWalletInput,
  KycProfileResponse,
  ManagedSmartWallet,
  OnboardingStatus,
  OwnerProofChallenge,
  OwnerProofChallengeInput,
  StartNigeriaOnboardingInput,
  StartNigeriaOnboardingResponse,
  SupportedSmartWalletCurrencies,
  UpdateNigeriaKycInput
} from "./schemas.js";

export interface BmoniGateway {
  createUser(input: CreateBmoniUserInput): Promise<BmoniUser>;
  getSupportedSmartWalletCurrencies(): Promise<SupportedSmartWalletCurrencies>;
  createOwnerProofChallenge(bmoniUserId: string, input: OwnerProofChallengeInput): Promise<OwnerProofChallenge>;
  createManagedSmartWallet(bmoniUserId: string, input: CreateManagedWalletInput): Promise<ManagedSmartWallet>;
  lookupBvn(bmoniUserId: string, bvn: string): Promise<BvnLookup>;
  updateNigeriaKyc(bmoniUserId: string, input: UpdateNigeriaKycInput): Promise<KycProfileResponse>;
  startNigeriaOnboarding(bmoniUserId: string, input: StartNigeriaOnboardingInput): Promise<StartNigeriaOnboardingResponse>;
  getOnboardingStatus(bmoniUserId: string): Promise<OnboardingStatus>;
  listAccountWallets(bmoniUserId: string): Promise<unknown>;
  listAccountBalances(bmoniUserId: string): Promise<unknown>;
  getSmartWallet(bmoniUserId: string, smartWalletId: string): Promise<unknown>;
  getNgnDepositAccount(bmoniUserId: string): Promise<unknown>;

  getNigerianBanks(bmoniUserId: string): Promise<unknown>;
  verifyNigerianAccount(bmoniUserId: string, input: { bankCode: string; accountNumber: string }): Promise<unknown>;
  registerNigerianWithdrawalAccount(bmoniUserId: string, input: {
    accountNumber: string;
    bankCode: string;
    bankName: string;
    accountHolderName: string;
  }): Promise<unknown>;
  offrampNigeria(bmoniUserId: string, smartWalletId: string, input: { bankAccountId: string; fromAmount: string }): Promise<unknown>;
  approveProposal(bmoniUserId: string, proposalId: string): Promise<unknown>;
  getProposalSignPayload(bmoniUserId: string, proposalId: string): Promise<unknown>;
  signProposal(bmoniUserId: string, proposalId: string, signature: string): Promise<unknown>;
  getProposal(bmoniUserId: string, proposalId: string): Promise<unknown>;
}
