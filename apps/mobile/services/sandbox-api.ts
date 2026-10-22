import { apiFetch } from "@/services/api-fetch";
import { parseSandboxWorkspace } from "@/services/sandbox-contract";
const base = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "") + "/api/sandbox-demo";

export const sandboxDemoCommand = "Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.";

export type ApiSandboxWorkspace = {
  localUserId: string;
  simulated: true;
  provider: "moniflow-sandbox";
  providerBalance: number;
  internalAllocated: number;
  availableToSpend: number;
  resetCount: number;
  activity: Array<{
    reference: string; kind: "BANK_WITHDRAWAL" | "POCKET_ALLOCATION";
    source: "simulated_external" | "simulated_internal";
    amount: number; label: string; status: "SIMULATED"
  }>;
  plan: null | {
    id: string; state: "AWAITING_APPROVAL" | "APPROVED" | "COMPLETED";
    planHash: string;
    approvedHash: string | null;
    verdict: { verdict: "ALLOW" | "REVIEW" | "BLOCK";
      checks: Array<{ rule: string; passed: boolean; severity: string; message: string }> };
    plan: { totals: { externalMovement: number; internalAllocation: number; availableAfter: number };
      actions: Array<{ index: number; label: string; amount: number; kind: string }> };
  };
};
export class SandboxApiError extends Error {
  constructor(readonly code: string, readonly httpStatus: number, message: string) { super(message); }
}
async function request(path: string, method: "GET" | "POST" = "GET", body?: Record<string, unknown>) {
  const response = await apiFetch(base + path, {
    method,
    ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {})
  });
  const json = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const code = typeof json?.code === "string" ? json.code : "DEMO_API_UNAVAILABLE";
    const message = typeof json?.message === "string" ? json.message
      : response.status === 404 ? "The authenticated sandbox is not enabled on this API release."
      : "The isolated sandbox request could not be completed.";
    throw new SandboxApiError(code, response.status, message);
  }
  // HTTP success does not establish verified owner or financial truth.
  // Fail closed on incomplete, forged, or inconsistent simulated snapshots.
  return parseSandboxWorkspace(json);
}
export const loadApiSandbox = () => request("/status");
export const bootstrapApiSandbox = () => request("/bootstrap", "POST");
export const prepareApiSandboxPlan = () => request("/plan", "POST", { command: sandboxDemoCommand });
export const approveApiSandboxPlan = (id: string, hash: string) =>
  request("/plans/" + encodeURIComponent(id) + "/approve", "POST", {
    expectedPlanHash: hash, acknowledged: true
  });
export const simulateApiSandboxPlan = (id: string) =>
  request("/plans/" + encodeURIComponent(id) + "/simulate", "POST");
export const resetApiSandbox = () =>
  request("/reset", "POST", { acknowledgment: "RESET_SIMULATED_WORKSPACE" });
