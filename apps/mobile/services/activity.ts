const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export type FinancialActivity = {
  id: string;
  localUserId: string;
  kind: string;
  status: string;
  amount: number | null;
  currency: string | null;
  reference: string;
  source: "provider" | "internal";
  metadata: Record<string, unknown>;
  createdAt: string;
};

export async function loadActivity(localUserId: string, limit = 50) {
  const response = await fetch(`${apiUrl}/api/activity?localUserId=${encodeURIComponent(localUserId)}&limit=${limit}`);
  const payload = (await response.json()) as { activity?: FinancialActivity[]; message?: string };
  if (!response.ok || !payload.activity) throw new Error(payload.message ?? "MONIFlow activity could not be loaded.");
  return payload.activity;
}
