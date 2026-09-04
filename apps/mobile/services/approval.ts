const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export type AuthorizationSnapshot = {
  planId: string;
  status: "AWAITING_USER_APPROVAL" | "APPROVED";
  planHash: string;
  amount: number;
  currency: "NGN";
  destination: {
    bankName: string;
    maskedAccountNumber: string | null;
    accountHolderName: string | null;
  };
  availableAfter: number;
  warning: string;
};

export type ApprovalResult = {
  planId: string;
  status: "APPROVED";
  approvedAt: string;
  approvedPlanHash: string;
};

export async function getAuthorization(planId: string, localUserId: string): Promise<AuthorizationSnapshot> {
  const response = await fetch(
    `${apiUrl}/api/operator/plans/${encodeURIComponent(planId)}/authorization?localUserId=${encodeURIComponent(localUserId)}`
  );
  const payload = (await response.json()) as { authorization?: AuthorizationSnapshot; message?: string; code?: string };
  if (!response.ok || !payload.authorization) {
    const error = new Error(payload.message ?? "Authorization details are unavailable.") as Error & { code?: string };
    error.code = payload.code;
    throw error;
  }
  return payload.authorization;
}

export async function approvePlan(
  planId: string,
  localUserId: string,
  expectedPlanHash: string
): Promise<ApprovalResult> {
  const response = await fetch(`${apiUrl}/api/operator/plans/${encodeURIComponent(planId)}/approve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ localUserId, expectedPlanHash })
  });
  const payload = (await response.json()) as { approval?: ApprovalResult; message?: string; code?: string };
  if (!response.ok || !payload.approval) {
    const error = new Error(payload.message ?? "MONIFlow could not record your approval.") as Error & { code?: string };
    error.code = payload.code;
    throw error;
  }
  return payload.approval;
}

export async function getExecutionReadiness(planId: string, localUserId: string) {
  const response = await fetch(
    `${apiUrl}/api/operator/plans/${encodeURIComponent(planId)}/execution-readiness?localUserId=${encodeURIComponent(localUserId)}`
  );
  return (await response.json()) as {
    planId: string;
    status?: string;
    canExecute: boolean;
    approvalHashMatches: boolean;
    error?: string;
    message?: string;
  };
}
