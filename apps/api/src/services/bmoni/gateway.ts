import type {
  BmoniUser,
  CreateBmoniUserInput,
  CreateManagedWalletInput,
  ManagedSmartWallet,
  OwnerProofChallenge,
  OwnerProofChallengeInput,
  SupportedSmartWalletCurrencies
} from "./schemas.js";

export interface BmoniGateway {
  createUser(input: CreateBmoniUserInput): Promise<BmoniUser>;
  getSupportedSmartWalletCurrencies(): Promise<SupportedSmartWalletCurrencies>;
  createOwnerProofChallenge(bmoniUserId: string, input: OwnerProofChallengeInput): Promise<OwnerProofChallenge>;
  createManagedSmartWallet(bmoniUserId: string, input: CreateManagedWalletInput): Promise<ManagedSmartWallet>;
}
