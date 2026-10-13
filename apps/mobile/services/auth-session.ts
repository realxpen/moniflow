import { useSyncExternalStore } from "react";

/**
 * MONIFlow's first secure session boundary.
 * Access tokens live in memory only — NEVER in the demo workspace store,
 * AsyncStorage, query strings, localStorage or logs.
 */
export type AuthSession = {
  accessToken: string;
  userId: string;
  email: string;
  expiresAt: number;
};

let session: AuthSession | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
function setSession(next: AuthSession | null) { session = next; emit(); }

export function currentAuthSession(): AuthSession | null {
  return session && session.expiresAt > Date.now() + 5000 ? session : null;
}
export function useAuthSession() {
  return useSyncExternalStore(subscribe, currentAuthSession, () => null);
}
function subscribe(callback: () => void) { listeners.add(callback); return () => { listeners.delete(callback); }; }
export function signOut() { setSession(null); }

const authUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export function authIsConfigured() {
  return Boolean(authUrl && publishableKey);
}

function config() {
  if (!authIsConfigured()) {
    throw new Error("Authentication is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to the website project.");
  }
  const base = new URL(authUrl);
  if (base.protocol !== "https:" && !(__DEV__ && base.hostname === "localhost")) {
    throw new Error("Authentication URL must use HTTPS.");
  }
  if (base.username || base.password || base.search || base.hash) throw new Error("Authentication URL is invalid.");
  return { base: base.origin, key: publishableKey };
}

type LoginResponse = {
  access_token?: string;
  expires_in?: number;
  user?: { id?: string; email?: string };
  error_description?: string;
  msg?: string;
  message?: string;
};

async function authRequest(path: string, email: string, password: string) {
  const { base, key } = config();
  const response = await fetch(base + "/auth/v1/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify({ email: email.toLowerCase().trim(), password })
  });
  const result = await response.json() as LoginResponse;
  if (!response.ok) throw new Error(result.error_description ?? result.msg ?? result.message ?? "Sign-in failed.");
  return result;
}

function remember(result: LoginResponse): AuthSession {
  if (!result.access_token || !result.user?.id || !result.expires_in) throw new Error("Account requires email confirmation. Check your inbox before signing in.");
  const next: AuthSession = {
    accessToken: result.access_token,
    userId: result.user.id,
    email: result.user.email ?? "",
    expiresAt: Date.now() + result.expires_in * 1000
  };
  setSession(next);
  return next;
}

export async function signInWithPassword(email: string, password: string) {
  return remember(await authRequest("token?grant_type=password", email, password));
}

export async function signUpWithPassword(email: string, password: string) {
  const result = await authRequest("signup", email, password);
  if (result.access_token) {
    remember(result);
    return true;
  }
  return false;
}
