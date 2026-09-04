const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export type ExecutionSnapshot = {
  planId: string;
  proposalId: string;
  amount: number;
  currency: "NGN";
  hashToSign: string | null;
  providerStatus: string | null;
  state: "PREPARING" | "AWAITING_DEVICE_SIGNATURE" | "PROCESSING" | "COMPLETED" | "FAILED";
  updatedAt: string;
};

export async function prepareExecution(planId: string, localUserId: string): Promise<ExecutionSnapshot> {
  const response = await fetch(`${apiUrl}/api/operator/plans/${encodeURIComponent(planId)}/execution/prepare`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ localUserId })
  });
  const payload = (await response.json()) as { execution?: ExecutionSnapshot; message?: string; code?: string } & Partial<ExecutionSnapshot>;
  if (!response.ok) throw makeError(payload.message ?? "BMONI execution could not be prepared.", payload.code);
  const execution = payload.execution ?? (payload.planId ? payload as ExecutionSnapshot : undefined);
  if (!execution) throw new Error("Execution response is incomplete.");
  return execution;
}

export async function submitExecutionSignature(planId: string, localUserId: string, proposalId: string, signature: string): Promise<ExecutionSnapshot> {
  const response = await fetch(`${apiUrl}/api/operator/plans/${encodeURIComponent(planId)}/execution/sign`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ localUserId, proposalId, signature })
  });
  const payload = (await response.json()) as { execution?: ExecutionSnapshot; message?: string; code?: string };
  if (!response.ok || !payload.execution) throw makeError(payload.message ?? "BMONI rejected the proposal signature.", payload.code);
  return payload.execution;
}

export async function getExecutionStatus(planId: string, localUserId: string): Promise<ExecutionSnapshot> {
  const response = await fetch(`${apiUrl}/api/operator/plans/${encodeURIComponent(planId)}/execution/status?localUserId=${encodeURIComponent(localUserId)}`);
  const payload = (await response.json()) as { execution?: ExecutionSnapshot; message?: string };
  if (!response.ok || !payload.execution) throw new Error(payload.message ?? "Could not read BMONI proposal status.");
  return payload.execution;
}

function makeError(message: string, code?: string) {
  const error = new Error(message) as Error & { code?: string };
  error.code = code;
  return error;
}
