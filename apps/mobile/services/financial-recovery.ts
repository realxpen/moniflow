import { apiFetch } from "@/services/api-fetch";
import { sessionForApiRequest } from "@/services/auth-session";
import { resolveApiUrl } from "@/services/runtime";

import { validateFinancialRecoveryPayload } from "./financial-recovery-contract";

export { financialRecoveryDescriptions, validateFinancialRecoveryPayload } from "./financial-recovery-contract";
export type { FinancialRecoveryState, FinancialRecoverySnapshot } from "./financial-recovery-contract";

export async function loadFinancialRecovery(): Promise<FinancialRecoverySnapshot> {
  const active = await sessionForApiRequest();
  if (!active) throw new Error("Sign in before opening your financial recovery review.");
  const response = await apiFetch(resolveApiUrl() + "/api/workspace/financial-recovery", { method: "GET" });
  if (response.status === 404) throw new Error("The financial recovery API is not available on this release.");
  if (!response.ok || !(response.headers.get("content-type") ?? "").includes("application/json")) {
    throw new Error("Your local financial recovery evidence is unavailable. No payment action was taken.");
  }
  const data = validateFinancialRecoveryPayload(await response.json(), active.userId);
  const latest = await sessionForApiRequest();
  if (!latest || latest.userId.toLowerCase() !== active.userId.toLowerCase()) {
    throw new Error("Your account changed during the recovery check. Reload your signed-in workspace.");
  }
  return data as FinancialRecoverySnapshot;
}

