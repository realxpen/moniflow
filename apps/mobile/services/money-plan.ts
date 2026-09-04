import type { MoniflowIntent } from "@/services/intent-engine";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export type MoneyPlanAction = {
  index: number;
  kind: "BANK_WITHDRAWAL" | "ALLOCATE_POCKET" | "CREATE_POCKET" | "CHECK_BALANCE" | "SHOW_ACTIVITY";
  label: string;
  description: "Withdrawal" | "Allocation" | "Create pocket" | "Balance check" | "Activity view";
  amount: number;
  movement: "EXTERNAL" | "INTERNAL" | "NONE";
  requiresApproval: boolean;
};

export type MoneyPlan = {
  currency: "NGN";
  currentAvailable: number;
  actions: MoneyPlanAction[];
  totals: {
    externalMovement: number;
    internalAllocation: number;
    totalCommitted: number;
    availableAfter: number;
  };
  requiresApproval: boolean;
  sourceIntent: "CHECK_BALANCE" | "BANK_WITHDRAWAL" | "CREATE_POCKET" | "ALLOCATE_POCKET" | "SHOW_ACTIVITY" | "MULTI_ACTION";
};

export type PreparedMoneyPlan = {
  plan: MoneyPlan;
  planId: string;
  planHash: string;
  status: "VALIDATING";
};

export async function prepareMoneyPlan(
  intent: MoniflowIntent,
  localUserId: string,
  originalInstruction?: string
): Promise<PreparedMoneyPlan> {
  const response = await fetch(`${apiUrl}/api/operator/plan`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ intent, localUserId, originalInstruction })
  });
  const payload = (await response.json()) as Partial<PreparedMoneyPlan> & { message?: string };
  if (!response.ok || !payload.plan || !payload.planId || !payload.planHash) {
    throw new Error(payload.message ?? "MONIFlow could not prepare a money plan.");
  }
  return {
    plan: payload.plan,
    planId: payload.planId,
    planHash: payload.planHash,
    status: "VALIDATING"
  };
}
