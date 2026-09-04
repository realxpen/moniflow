const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export type NigerianBank = { name: string; code: string };
export type VerifiedDestination = {
  id: string;
  label: string;
  providerAccountId: string;
  bankCode: string;
  bankName: string;
  maskedAccountNumber: string;
  accountHolderName: string;
  verified: true;
};

export async function getNigerianBanks(localUserId: string): Promise<NigerianBank[]> {
  const response = await fetch(`${apiUrl}/api/banks?localUserId=${encodeURIComponent(localUserId)}`);
  const payload = (await response.json()) as { banks?: NigerianBank[]; message?: string };
  if (!response.ok || !payload.banks) throw new Error(payload.message ?? "Could not load Nigerian banks.");
  return payload.banks;
}

export async function verifyNigerianBankAccount(localUserId: string, bankCode: string, accountNumber: string) {
  const response = await fetch(`${apiUrl}/api/banks/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ localUserId, bankCode, accountNumber })
  });
  const payload = (await response.json()) as { verified?: boolean; accountHolderName?: string; message?: string };
  if (!response.ok || !payload.verified || !payload.accountHolderName) throw new Error(payload.message ?? "Bank account verification failed.");
  return { verified: true as const, accountHolderName: payload.accountHolderName };
}

export async function registerNigerianBankAccount(input: {
  localUserId: string;
  label: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}): Promise<VerifiedDestination> {
  const response = await fetch(`${apiUrl}/api/banks/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as { destination?: VerifiedDestination; message?: string };
  if (!response.ok || !payload.destination) throw new Error(payload.message ?? "Could not register bank destination.");
  return payload.destination;
}
