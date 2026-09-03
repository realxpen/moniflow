import type {
  BmoniUser,
  CreateBmoniUserInput,
  SupportedSmartWalletCurrencies
} from "./schemas.js";

export interface BmoniGateway {
  createUser(input: CreateBmoniUserInput): Promise<BmoniUser>;
  getSupportedSmartWalletCurrencies(): Promise<SupportedSmartWalletCurrencies>;
}
