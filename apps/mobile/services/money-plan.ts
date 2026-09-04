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

export async function prepareMoneyPlan(input: string, localUserId: string): Promise<MoneyPlan> {
  const response = await fetch(`${apiUrl}/api/operator/plan`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input, localUserId })
  });
  const payload = (await response.json()) as { plan?: MoneyPlan; message?: string };
  if (!response.ok || !payload.plan) {
    throw new Error(payload.message ?? "MONIFlow could not prepare a money plan.");
  }
  return payload.plan;
}
