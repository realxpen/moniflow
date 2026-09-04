export type WalletOwnership = {
  localUserId: string;
  ownerAddress: string;
  bmoniSmartWalletId: string;
  smartWalletAddress: string;
  currency: "CNGN";
  createdAt: string;
  updatedAt: string;
};

export interface WalletOwnershipRepository {
  findByLocalUserId(localUserId: string): Promise<WalletOwnership | null>;
  save(value: WalletOwnership): Promise<WalletOwnership>;
  close(): Promise<void>;
}
