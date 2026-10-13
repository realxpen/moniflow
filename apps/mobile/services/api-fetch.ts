import { currentAuthSession } from "@/services/auth-session";

const defaultTimeoutMs = 12_000;

export async function apiFetch(url: string, init?: RequestInit, timeoutMs = defaultTimeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(init?.headers);
    const expectedApi = process.env.EXPO_PUBLIC_API_URL?.trim();
    // Never send a financial session token to unrelated domains.
    if (expectedApi && new URL(url).origin === new URL(expectedApi).origin) {
      const session = currentAuthSession();
      if (session) headers.set("Authorization", "Bearer " + session.accessToken);
    }
    return await fetch(url, { ...init, headers, signal: controller.signal });
  } catch (cause) {
    if (controller.signal.aborted) {
      throw new Error("MONIFlow API request timed out. Check the connection and try again.");
    }
    throw cause;
  } finally {
    clearTimeout(timer);
  }
}
