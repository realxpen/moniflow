const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export type GuardRuleName =
  | "SUPPORTED_INTENT"
  | "POSITIVE_AMOUNT"
  | "CURRENCY"
  | "BALANCE"
  | "DESTINATION"
  | "AMOUNT_INTEGRITY"
  | "PLAN_INTEGRITY"
  | "HUMAN_APPROVAL";

export type GuardCheck = {
  rule: GuardRuleName;
  passed: boolean;
  severity: "info" | "warning" | "critical";
  message: string;
};

export type GuardResult = {
  verdict: "ALLOW" | "REVIEW" | "BLOCK";
  checks: GuardCheck[];
  planId: string;
  planHash: string;
  status: "BLOCKED" | "AWAITING_USER_APPROVAL" | "APPROVED";
};

export async function runMoniGuard(planId: string, localUserId: string): Promise<GuardResult> {
  const response = await fetch(`${apiUrl}/api/operator/plans/${encodeURIComponent(planId)}/guard`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ localUserId })
  });
  const payload = (await response.json()) as Partial<GuardResult> & { message?: string };
  if (!response.ok || !payload.verdict || !Array.isArray(payload.checks) || !payload.planId || !payload.planHash || !payload.status) {
    throw new Error(payload.message ?? "MONI Guard could not evaluate this persisted plan.");
  }
  return payload as GuardResult;
}
