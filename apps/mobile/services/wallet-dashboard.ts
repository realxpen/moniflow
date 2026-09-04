const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export type WalletSummary = {
  id: string;
  address: string;
  currency: string;
  status: string;
};

export type WalletBalance = {
  amount: string;
  currency: string;
  fiatCurrency: string;
  source: "bmoni";
};

export type DepositAccount = {
  accountNumber: string;
  accountName: string | null;
  bankName: string | null;
  currency: "NGN";
  status: string;
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`);
  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "MONIFlow wallet request failed.");
  return payload;
}

export async function loadWallet(localUserId: string) {
  const payload = await getJson<{ wallet: WalletSummary }>(`/api/wallet?localUserId=${encodeURIComponent(localUserId)}`);
  return payload.wallet;
}

export async function loadWalletBalance(localUserId: string) {
  const payload = await getJson<{ balance: WalletBalance }>(`/api/wallet/balance?localUserId=${encodeURIComponent(localUserId)}`);
  return payload.balance;
}

export async function loadDepositAccount(localUserId: string) {
  const response = await fetch(`${apiUrl}/api/wallet/deposit-account?localUserId=${encodeURIComponent(localUserId)}`);
  if (response.status === 404) return null;
  const payload = (await response.json()) as { depositAccount?: DepositAccount; message?: string };
  if (!response.ok || !payload.depositAccount) throw new Error(payload.message ?? "Deposit account could not be loaded.");
  return payload.depositAccount;
}
