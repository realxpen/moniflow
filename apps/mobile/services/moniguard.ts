import type { MoniflowIntent } from "@/services/intent-engine";
import type { MoneyPlan } from "@/services/money-plan";

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
};

export async function runMoniGuard(intent: MoniflowIntent, plan: MoneyPlan): Promise<GuardResult> {
  const response = await fetch(`${apiUrl}/api/operator/guard`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ intent, plan })
  });
  const payload = (await response.json()) as GuardResult & { message?: string };
  if (!response.ok || !payload.verdict || !Array.isArray(payload.checks)) {
    throw new Error(payload.message ?? "MONI Guard could not evaluate this plan.");
  }
  return payload;
}
