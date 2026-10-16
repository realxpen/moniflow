import { apiFetch } from "@/services/api-fetch";
import { sessionForApiRequest } from "@/services/auth-session";
import { resolveApiUrl } from "@/services/runtime";

export type VerifiedSessionRead = {
  authenticated: true;
  userId: string;
  providerMappingState: "not_checked";
  walletState: "not_checked";
  kycState: "not_checked";
  financialOperationsEnabled: false;
};

/** A successfully signed-in device must still prove JWT ownership to our API. */
export async function loadVerifiedApiSession(): Promise<VerifiedSessionRead> {
  const session = await sessionForApiRequest();
  if (!session) throw new Error("Your MONIFlow session has ended. Please sign in again.");
  const response = await apiFetch(resolveApiUrl() + "/api/auth/session", { method: "GET" });
  if (response.status === 404) {
    throw new Error("The API's new session verification endpoint is not deployed yet. Your sign-in did not authorize financial operations.");
  }
  if (!response.ok) {
    throw new Error(response.status === 503
      ? "The API cannot verify sessions yet. Contact MONIFlow support before proceeding."
      : "The API could not confirm your sign-in. No wallet or financial action was attempted.");
  }
  if (!(response.headers.get("content-type") ?? "").includes("application/json")) {
    throw new Error("MONIFlow returned an unexpected session response.");
  }
  const payload = await response.json() as Partial<VerifiedSessionRead>;
  if (payload.authenticated !== true || payload.userId?.toLowerCase() !== session.userId.toLowerCase() ||
    payload.providerMappingState !== "not_checked" || payload.walletState !== "not_checked" ||
    payload.kycState !== "not_checked" || payload.financialOperationsEnabled !== false) {
    throw new Error("The API session identity or readiness did not match the signed-in user. No wallet data was shown.");
  }
  return payload as VerifiedSessionRead;
}
