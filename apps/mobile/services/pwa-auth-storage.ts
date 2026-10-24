/**
 * Browser-only login continuity for the opt-in, simulation-only iPhone PWA.
 *
 * The browser can read its own persistent storage; unlike an HttpOnly cookie,
 * this is NOT suitable for real money, KYC or wallet-signing authorization.
 * Store only a Supabase refresh token (never access token/password/PII), scoped
 * to the exact reviewed Expo Hosting preview origin and an expiry limit.
 *
 * All non-PWA builds remain memory-only. If Safari has disabled storage, the
 * app still works for the current session and may request login on relaunch.
 */
const key = "moniflow.pwa.sandbox-auth.refresh.v1";
const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
const previewOrigin = "https://xpen-moniflow-pwa-202610--n9px8b7cup.expo.app";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Persisted = {
  version: 1;
  userId: string;
  refreshToken: string;
  savedAt: number;
};

function storage(): Storage | null {
  if (process.env.EXPO_PUBLIC_MONIFLOW_PWA_PREVIEW !== "1") return null;
  if (typeof window === "undefined" || window.location?.origin !== previewOrigin) return null;
  try { return window.localStorage; } catch { return null; }
}

export function readPwaRefreshCredential(): { userId: string; refreshToken: string } | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(key);
    if (!raw) return null;
    const entry: unknown = JSON.parse(raw);
    if (!entry || typeof entry !== "object") throw Error("Invalid storage");
    const value = entry as Partial<Persisted>;
    if (value.version !== 1 ||
        typeof value.userId !== "string" || !uuid.test(value.userId) ||
        typeof value.refreshToken !== "string" || value.refreshToken.length < 10 ||
        value.refreshToken.length > 4096 ||
        typeof value.savedAt !== "number" ||
        !Number.isFinite(value.savedAt) || value.savedAt > Date.now() + 60_000 ||
        Date.now() - value.savedAt > maxAgeMs) {
      throw Error("Expired, malformed, or untrusted stored login");
    }
    return { userId: value.userId, refreshToken: value.refreshToken };
  } catch {
    try { s.removeItem(key); } catch { /* denied storage is a signed-out state */ }
    return null;
  }
}

export function persistPwaRefreshCredential(userId: string, refreshToken: string | null): void {
  const s = storage();
  if (!s) return;
  if (!refreshToken || !uuid.test(userId) || refreshToken.length < 10 || refreshToken.length > 4096) {
    clearPwaRefreshCredential();
    return;
  }
  try {
    s.setItem(key, JSON.stringify({
      version: 1, userId, refreshToken, savedAt: Date.now()
    } satisfies Persisted));
  } catch {
    // Safari private mode/quota errors must never block ordinary sign-in.
  }
}

export function clearPwaRefreshCredential(expectedRefreshToken?: string): void {
  const s = storage();
  if (!s) return;
  try {
    if (expectedRefreshToken && readPwaRefreshCredential()?.refreshToken !== expectedRefreshToken) return;
    s.removeItem(key);
  } catch { /* the next launch must fail closed */ }
}
