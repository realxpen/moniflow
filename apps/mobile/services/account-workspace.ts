import { apiFetch } from "@/services/api-fetch";
import { sessionForApiRequest } from "@/services/auth-session";
import { resolveApiUrl } from "@/services/runtime";

export type AccountWorkspaceOverview = {
  authenticated: true;
  userId: string;
  mapping: "not_linked" | "recorded";
  wallet: "not_created" | "recorded_not_reverified";
  kyc: "not_checked";
  providerReadAccess: false;
  financialOperationsEnabled: false;
  accountData: "withheld_until_verified";
};

const validMapping = new Set(["not_linked", "recorded"]);
const validWallet = new Set(["not_created", "recorded_not_reverified"]);

/** Always verify a live, owner-scoped subject before showing any workspace status. */
export async function loadAccountWorkspace(): Promise<AccountWorkspaceOverview> {
  const active = await sessionForApiRequest();
  if (!active) throw new Error("Sign in again to load your personal workspace.");
  const response = await apiFetch(resolveApiUrl() + "/api/workspace/overview", { method: "GET" });
  if (response.status === 404) throw new Error("The updated workspace API is not deployed yet.");
  if (!response.ok) throw new Error("Your account workspace could not be verified. No financial data was loaded.");
  if (!(response.headers.get("content-type") ?? "").includes("application/json")) {
    throw new Error("Unexpected workspace response from MONIFlow.");
  }
  const data = await response.json() as Partial<AccountWorkspaceOverview>;
  if (data.authenticated !== true || typeof data.userId !== "string" ||
      data.userId.toLowerCase() !== active.userId.toLowerCase() ||
      !validMapping.has(data.mapping ?? "") || !validWallet.has(data.wallet ?? "") ||
      data.kyc !== "not_checked" || data.providerReadAccess !== false ||
      data.financialOperationsEnabled !== false ||
      data.accountData !== "withheld_until_verified" ||
      (data.mapping === "not_linked" && data.wallet !== "not_created")) {
    throw new Error("Workspace identity or readiness did not match. No financial data was shown.");
  }
  // A sign-out or account switch while awaiting the network must not leak a response.
  const latest = await sessionForApiRequest();
  if (!latest || latest.userId.toLowerCase() !== active.userId.toLowerCase()) {
    throw new Error("The signed-in account changed. Reload your workspace.");
  }
  return data as AccountWorkspaceOverview;
}
