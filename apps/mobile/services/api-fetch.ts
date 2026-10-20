import { invalidateRejectedSession, sessionForApiRequest } from "@/services/auth-session";

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
    if (process.env.EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW === "1" && isOurApi &&
        !["GET", "HEAD"].includes((init?.method ?? "GET").toUpperCase())) {
      throw new Error("This MONIFlow Waydroid preview is read-only. Use the physical Android app for financial workflows.");
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
    if (cause instanceof TypeError && /fetch|network|load/i.test(cause.message)) {
      throw new Error("Cannot reach MONIFlow API. Check the deployed API address, your connection, and browser access settings.", { cause });
    }
    throw cause;
  } finally {
    clearTimeout(timer);
  }
}
