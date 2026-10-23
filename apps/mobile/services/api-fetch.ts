import { invalidateRejectedSession, sessionForApiRequest } from "@/services/auth-session";
import { friendlyNetworkError } from "@/services/network-error";
import { isAllowedWaydroidSandboxMutation } from "@/services/waydroid-sandbox-write-policy";

const defaultTimeoutMs = 12000;

/** Bounded requests; consequential mutations are NEVER automatically retried. */
export async function apiFetch(url: string, init?: RequestInit, timeoutMs = defaultTimeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(init?.headers);
    const expectedApi = process.env.EXPO_PUBLIC_API_URL?.trim();
    const apiOrigin = expectedApi ? new URL(expectedApi).origin : null;
    const target = new URL(url);
    const isOurApi = !!apiOrigin && target.origin === apiOrigin;
    // The Waydroid variant is for authenticated reads and navigation only.
    // Block workspace mutations before any HTTP request is sent.
    const method = (init?.method ?? "GET").toUpperCase();
    // All finance writes stay blocked in both x86 APKs. Only the distinctly
    // packaged sandbox APK may POST to a tiny authenticated DEMO namespace on
    // one exact staging host. This check runs before JWT lookup or fetch.
    if (process.env.EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW === "1" &&
        !["GET", "HEAD"].includes(method) &&
        !isAllowedWaydroidSandboxMutation({
          waydroidPreview: true,
          dedicatedSandboxPreview: process.env.EXPO_PUBLIC_MONIFLOW_SANDBOX_PREVIEW === "1",
          configuredApiUrl: expectedApi,
          requestUrl: url,
          method
        })) {
      throw new Error("Waydroid financial operations are disabled. Only the separately packaged MONIFlow Sandbox app may save simulated Money Plans and Activity.");
    }
    // Health is public; authentication trouble must not make provider health look offline.
    const isHealth = target.pathname.startsWith("/health");
    let tokenUsed: string | null = null;
    if (isOurApi && !isHealth) {
      const session = await sessionForApiRequest();
      if (session) {
        headers.set("Authorization", "Bearer " + session.accessToken);
        tokenUsed = session.accessToken;
      }
    }
    const response = await fetch(url, { ...init, headers, signal: controller.signal });
    if (response.redirected && new URL(response.url).origin !== target.origin) {
      throw new Error("MONIFlow API redirected to another site. Check the API domain and Vercel Deployment Protection.");
    }
    if (isOurApi && response.status === 401) {
      if (tokenUsed) invalidateRejectedSession(tokenUsed);
      throw new Error("Your MONIFlow session is no longer valid. Sign in again.");
    }
    if (isOurApi && response.status === 403) {
      throw new Error("This financial workspace is not authorized for your account.");
    }
    return response;
  } catch (cause) {
    if (controller.signal.aborted) {
      throw new Error("MONIFlow API request timed out. Check your connection and try again.");
    }
    const connectionError = friendlyNetworkError(cause);
    if (connectionError) throw connectionError;
    throw cause;
  } finally {
    clearTimeout(timer);
  }
}
