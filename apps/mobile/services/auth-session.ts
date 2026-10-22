import { useSyncExternalStore } from "react";

/** Financial sign-in and refresh tokens are memory-only. Reload requires sign-in. */
export type AuthSession = {
  accessToken: string;
  userId: string;
  email: string;
  expiresAt: number;
};

let session: AuthSession | null = null;
let refreshToken: string | null = null;
let refreshInFlight: Promise<AuthSession | null> | null = null;
// Late sign-in/sign-up responses must not restore an account after sign-out,
// or overwrite a more recent attempt for another account.
let authIntentRevision = 0;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(listener => listener());
function setSession(next: AuthSession | null, nextRefresh: string | null = null) {
  session = next;
  refreshToken = nextRefresh;
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
      throw new Error(result.error_description ?? result.msg ?? result.message ?? "Authentication failed.");
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
    throw new Error("Session identity changed unexpectedly. Sign in again.");
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
      if (session === previous && refreshToken === token) signOut();
      throw new Error("MONIFlow could not renew your session. Sign in again.", { cause });
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
