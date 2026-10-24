import { afterEach, describe, expect, it, vi } from "vitest";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

function browser(origin = "https://xpen-moniflow-pwa-202610--n9px8b7cup.expo.app") {
  const values = new Map<string, string>();
  const store = {
    getItem: vi.fn((k: string) => values.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => { values.set(k, v); }),
    removeItem: vi.fn((k: string) => { values.delete(k); }),
    clear: vi.fn(() => values.clear()),
    key: vi.fn(() => null),
    get length() { return values.size; }
  };
  const u = new URL(origin);
  vi.stubGlobal("window", { location: { origin: u.origin, hostname: u.hostname, protocol: u.protocol }, localStorage: store });
  vi.stubEnv("EXPO_PUBLIC_MONIFLOW_PWA_PREVIEW", "1");
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_test_only");
  vi.stubGlobal("__DEV__", false);
  return { values, store };
}

async function auth() {
  vi.resetModules();
  return import("./auth-session");
}

function result(userId = userA, accessToken = "new-access") {
  return {
    access_token: accessToken,
    refresh_token: "refresh-session-for-" + userId,
    expires_in: 3600,
    user: { id: userId, email: "sandbox@example.test" }
  };
}

describe("installed iPhone PWA: stay signed in with verified token rotation", () => {
  it("remembers only a refresh credential, reopens and obtains a NEW authenticated access token", async () => {
    const { values } = browser();
    const fetchMock = vi.fn(async (url: string, init: { body: string }) => {
      const body = JSON.parse(init.body);
      if (url.includes("grant_type=password")) return { ok: true, json: async () => result(userA, "first-access") };
      expect(url).toContain("grant_type=refresh_token");
      expect(body.refresh_token).toContain(userA);
      return { ok: true, json: async () => result(userA, "second-access") };
    });
    vi.stubGlobal("fetch", fetchMock);
    let a = await auth();
    await a.signInWithPassword("sandbox@example.test", "testpassword!");
    const raw = [...values.values()][0];
    expect(raw).toContain("refresh-session-for-");
    expect(raw).not.toContain("first-access");
    expect(raw).not.toContain("sandbox@example.test");
    // Simulate a full Safari PWA JavaScript process restart.
    a = await auth();
    expect(a.currentAuthSession()).toBeNull();
    const [restored1, restored2] = await Promise.all([a.restoreAuthSession(), a.restoreAuthSession()]);
    expect(restored1?.accessToken).toBe("second-access");
    expect(restored2?.userId).toBe(userA);
    expect(a.currentAuthSession()?.userId).toBe(userA);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears the remembered credential on explicit sign-out, including after reload", async () => {
    const { values } = browser();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => result() })));
    let a = await auth();
    await a.signInWithPassword("sandbox@example.test", "testpassword!");
    expect(values.size).toBe(1);
    a.signOut();
    expect(values.size).toBe(0);
    a = await auth();
    expect(await a.restoreAuthSession()).toBeNull();
  });

  it("never restores a refresh response for a different owner; erases the stored credential", async () => {
    const { values } = browser();
    let current = userA;
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => result(current) })));
    let a = await auth();
    await a.signInWithPassword("sandbox@example.test", "testpassword!");
    current = userB;
    a = await auth();
    expect(await a.restoreAuthSession()).toBeNull();
    expect(a.currentAuthSession()).toBeNull();
    expect(values.size).toBe(0);
  });

  it("rejects late refresh completions after sign-out or a newer login", async () => {
    const { values } = browser();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => result() })));
    let a = await auth();
    await a.signInWithPassword("sandbox@example.test", "testpassword!");
    a = await auth();
    let release: ((v: unknown) => void) | undefined;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(resolve => { release = resolve; })));
    const pending = a.restoreAuthSession();
    a.signOut();
    release?.({ ok: true, json: async () => result() });
    expect(await pending).toBeNull();
    expect(a.currentAuthSession()).toBeNull();
    expect(values.size).toBe(0);
  });

  it("will not persist outside the sandbox PWA or on an untrusted HTTP/origin", async () => {
    const { values } = browser("https://another-preview.expo.app");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => result() })));
    const a = await auth();
    await a.signInWithPassword("sandbox@example.test", "testpassword!");
    expect(values.size).toBe(0);
    a.signOut();
    vi.stubEnv("EXPO_PUBLIC_MONIFLOW_PWA_PREVIEW", "0");
    expect((await import("./pwa-auth-storage")).readPwaRefreshCredential()).toBeNull();
  });

  it("expires stored sessions after seven days and fails closed on malformed records", async () => {
    const { values } = browser();
    const storage = await import("./pwa-auth-storage");
    storage.persistPwaRefreshCredential(userA, "refresh-session");
    const key = [...values.keys()][0];
    const x = JSON.parse(values.get(key)!);
    x.savedAt = Date.now() - (8 * 24 * 3600 * 1000);
    values.set(key, JSON.stringify(x));
    expect(storage.readPwaRefreshCredential()).toBeNull();
    expect(values.size).toBe(0);
    values.set(key, "{invalid-json");
    expect(storage.readPwaRefreshCredential()).toBeNull();
    expect(values.size).toBe(0);
  });

  it("keeps the saved refresh credential after a temporary offline restart, for a later retry", async () => {
    const { values } = browser();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => result() })));
    let a = await auth();
    await a.signInWithPassword("sandbox@example.test", "testpassword!");
    a = await auth();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect(await a.restoreAuthSession()).toBeNull();
    expect(values.size).toBe(1);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => result() })));
    expect((await a.restoreAuthSession())?.userId).toBe(userA);
  });

  it("revokes a stored credential on explicit Supabase 401", async () => {
    const { values } = browser();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => result() })));
    let a = await auth();
    await a.signInWithPassword("sandbox@example.test", "testpassword!");
    a = await auth();
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false, status: 401,
      json: async () => ({ message: "Refresh token expired" })
    })));
    expect(await a.restoreAuthSession()).toBeNull();
    expect(values.size).toBe(0);
  });

  it("keeps authentication usable when Safari blocks persistent storage", async () => {
    browser();
    vi.stubGlobal("window", {
      location: new URL("https://xpen-moniflow-pwa-202610--n9px8b7cup.expo.app"),
      get localStorage() { throw new Error("Storage disabled"); }
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => result() })));
    const a = await auth();
    expect((await a.signInWithPassword("sandbox@example.test", "testpassword!")).userId).toBe(userA);
    expect(a.currentAuthSession()).not.toBeNull();
    expect(await a.restoreAuthSession()).not.toBeNull();
  });
});
