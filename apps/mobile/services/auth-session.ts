import { useSyncExternalStore } from "react";
import { clearPwaRefreshCredential, persistPwaRefreshCredential, readPwaRefreshCredential } from "./pwa-auth-storage";

/** Access tokens are always memory-only; only a bounded sandbox PWA refresh credential can survive Safari relaunch. */
export type AuthSession = {
  accessToken: string;
  userId: string;
  email: string;
  expiresAt: number;
};

let session: AuthSession | null = null;
let refreshToken: string | null = null;
let refreshInFlight: Promise<AuthSession | null> | null = null;
let restoreInFlight: Promise<AuthSession | null> | null = null;
// Late sign-in/sign-up responses must not restore an account after sign-out,
// or overwrite a more recent attempt for another account.
let authIntentRevision = 0;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(listener => listener());
function setSession(next: AuthSession | null, nextRefresh: string | null = null) {
  session = next;
  refreshToken = nextRefresh;
  if (next && nextRefresh) persistPwaRefreshCredential(next.userId, nextRefresh);
  else clearPwaRefreshCredential();
  emit();
}
export function signOut() {
  authIntentRevision += 1;
  setSession(null);
}

export function currentAuthSession(): AuthSession | null {
  return session && session.expiresAt > Date.now() + 5000 ? session : null;
}
function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}
export function useAuthSession() {
  return useSyncExternalStore(subscribe, currentAuthSession, () => null);
}

const authUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export function authIsConfigured() {
  return Boolean(authUrl && publishableKey);
}
function config() {
  if (!authIsConfigured()) throw new Error("Authentication is not configured for MONIFlow.");
  const parsed = new URL(authUrl);
  if (parsed.protocol !== "https:" && !(__DEV__ && parsed.hostname === "localhost")) {
    throw new Error("Authentication must use HTTPS.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Authentication URL is invalid.");
  }
  return { base: parsed.origin, key: publishableKey };
}

class AuthRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
class AuthIdentityMismatchError extends Error {}

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id?: string; email?: string };
  error_description?: string;
  msg?: string;
  message?: string;
};

async function authRequest(path: string, payload: Record<string, string>): Promise<AuthResponse> {
  const { base, key } = config();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(base + "/auth/v1/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const result = await response.json() as AuthResponse;
    if (!response.ok) {
      throw new AuthRequestError(result.error_description ?? result.msg ?? result.message ?? "Authentication failed.", response.status);
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}

function remember(result: AuthResponse, previous?: AuthSession): AuthSession {
  if (!result.access_token || !result.user?.id || !result.expires_in) {
    throw new Error("Confirm your email, then sign in to MONIFlow.");
  }
  if (previous && previous.userId !== result.user.id) {
    throw new AuthIdentityMismatchError("Session identity changed unexpectedly. Sign in again.");
  }
  if (!Number.isFinite(result.expires_in) || result.expires_in <= 0 || result.expires_in > 86400) {
    throw new Error("The authentication server returned an invalid expiration.");
  }
  const next = {
    accessToken: result.access_token,
    userId: result.user.id,
    email: result.user.email ?? previous?.email ?? "",
    expiresAt: Date.now() + result.expires_in * 1000
  };
  setSession(next, result.refresh_token ?? null);
  return next;
}
function assertCurrentAuthAttempt(revision: number) {
  if (revision !== authIntentRevision) {
    throw new Error("This sign-in attempt was cancelled or replaced. Please sign in again.");
  }
}
export async function signInWithPassword(email: string, password: string) {
  const revision = ++authIntentRevision;
  const result = await authRequest("token?grant_type=password", { email: email.toLowerCase().trim(), password });
  assertCurrentAuthAttempt(revision);
  return remember(result);
}
export async function signUpWithPassword(email: string, password: string) {
  const revision = ++authIntentRevision;
  const result = await authRequest("signup", { email: email.toLowerCase().trim(), password });
  assertCurrentAuthAttempt(revision);
  if (result.access_token) {
    remember(result);
    return true;
  }
  return false;
}

/**
 * Reopen an installed iPhone PWA by exchanging a storage-scoped refresh token
 * for a NEW access token over HTTPS. No access token or account balance is read
 * from browser storage. The Auth API's userId must match the remembered owner.
 * All older pending restore requests are discarded on sign-out or fresh login.
 */
export function restoreAuthSession(): Promise<AuthSession | null> {
  if (restoreInFlight) return restoreInFlight;
  if (session) return Promise.resolve(currentAuthSession());
  const stored = readPwaRefreshCredential();
  if (!stored) return Promise.resolve(null);
  const revision = authIntentRevision;
  const request = (async () => {
    try {
      const result = await authRequest("token?grant_type=refresh_token", {
        refresh_token: stored.refreshToken
      });
      if (revision !== authIntentRevision || session) return currentAuthSession();
      if (!result.user?.id || result.user.id.toLowerCase() !== stored.userId.toLowerCase() ||
          !result.refresh_token) {
        clearPwaRefreshCredential(stored.refreshToken);
        return null;
      }
      return remember(result, { accessToken: "", userId: stored.userId, email: "", expiresAt: 0 });
    } catch (cause) {
      // Offline Safari must not permanently lose a stored login. Only an
      // explicit invalid/revoked credential response can erase the token.
      if (cause instanceof AuthRequestError && [400, 401, 403].includes(cause.status) &&
          revision === authIntentRevision && !session) {
        clearPwaRefreshCredential(stored.refreshToken);
      }
      return null;
    }
  })();
  restoreInFlight = request;
  void request.finally(() => { if (restoreInFlight === request) restoreInFlight = null; });
  return request;
}

/** Serializes token renewal across concurrent reads. Never retries a money movement. */
export async function sessionForApiRequest(): Promise<AuthSession | null> {
  if (!session) return null;
  if (session.expiresAt > Date.now() + 60000) return session;
  if (!refreshToken) {
    signOut();
    return null;
  }
  if (refreshInFlight) return refreshInFlight;
  const previous = session;
  const token = refreshToken;
  const pending = (async () => {
    try {
      const result = await authRequest("token?grant_type=refresh_token", { refresh_token: token });
      if (session !== previous || refreshToken !== token) return currentAuthSession();
      return remember(result, previous);
    } catch (cause) {
      const revoked = cause instanceof AuthIdentityMismatchError ||
        (cause instanceof AuthRequestError && [400, 401, 403].includes(cause.status));
      if (revoked && session === previous && refreshToken === token) signOut();
      // Network/transient failure leaves the prior owner + saved refresh
      // credential untouched. Never reuse an expired access token for writes.
      throw new Error(revoked
        ? "MONIFlow could not renew your session. Sign in again."
        : "MONIFlow couldn't renew your session right now. Check your connection and retry the read.", { cause });
    }
  })();
  refreshInFlight = pending;
  try { return await pending; }
  finally { if (refreshInFlight === pending) refreshInFlight = null; }
}

/** A rejected request can only revoke the exact token it used. */
export function invalidateRejectedSession(accessToken: string) {
  if (session?.accessToken === accessToken) signOut();
}
