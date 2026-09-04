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
}
