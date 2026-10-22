import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function authModule() {
  vi.resetModules();
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_test_only");
  vi.stubGlobal("__DEV__", false);
  return import("./auth-session");
}

function body(accessToken: string, seconds: number, id = "11111111-1111-4111-8111-111111111111") {
  return {
    access_token: accessToken, refresh_token: "refresh-test-token", expires_in: seconds,
    user: { id, email: "demo@example.test" }
  };
}

describe("memory-only financial authentication", () => {
  it("coalesces parallel refresh requests into a single Supabase call", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("grant_type=password")) return { ok: true, json: async () => body("old-access", 30) };
      if (url.includes("grant_type=refresh_token")) return { ok: true, json: async () => body("new-access", 3600) };
      throw new Error("Unexpected Auth request");
    });
    vi.stubGlobal("fetch", fetchMock);
    const auth = await authModule();
    await auth.signInWithPassword("demo@example.test", "testpassword!");
    const [a, b, c] = await Promise.all([
      auth.sessionForApiRequest(), auth.sessionForApiRequest(), auth.sessionForApiRequest()
    ]);
    expect(a?.accessToken).toBe("new-access");
    expect(b?.accessToken).toBe("new-access");
    expect(c?.accessToken).toBe("new-access");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(auth.currentAuthSession()?.userId).toBe("11111111-1111-4111-8111-111111111111");
    auth.signOut();
    expect(auth.currentAuthSession()).toBeNull();
  });

  it("does not invalidate a newer session when an older token gets a 401", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => body("current-token", 3600) })));
    const auth = await authModule();
    await auth.signInWithPassword("demo@example.test", "testpassword!");
    auth.invalidateRejectedSession("stale-token");
    expect(auth.currentAuthSession()?.accessToken).toBe("current-token");
    auth.invalidateRejectedSession("current-token");
    expect(auth.currentAuthSession()).toBeNull();
  });

  it("rejects refreshed credentials with a different user identity", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes("grant_type=refresh_token")
        ? body("other-account", 3600, "22222222-2222-4222-8222-222222222222")
        : body("initial-account", 30)
    })));
    const auth = await authModule();
    await auth.signInWithPassword("demo@example.test", "testpassword!");
    await expect(auth.sessionForApiRequest()).rejects.toThrow("could not renew");
    expect(auth.currentAuthSession()).toBeNull();
  });
});


describe("account-switch and sign-out races", () => {
  it("does not resurrect a signed-out account when an earlier login finishes late", async () => {
    let resolveRequest: ((response: unknown) => void) | undefined;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(resolve => { resolveRequest = resolve; })));
    const auth = await authModule();
    const pendingLogin = auth.signInWithPassword("first@example.test", "testpassword!");
    auth.signOut();
    resolveRequest?.({ ok: true, json: async () => body("late-token", 3600) });
    await expect(pendingLogin).rejects.toThrow("cancelled or replaced");
    expect(auth.currentAuthSession()).toBeNull();
  });

  it("keeps the most recently requested identity despite out-of-order login responses", async () => {
    const pending = new Map<string, (response: unknown) => void>();
    vi.stubGlobal("fetch", vi.fn((_url: string, init: { body: string }) =>
      new Promise(resolve => { pending.set(JSON.parse(init.body).email, resolve); })
    ));
    const auth = await authModule();
    const older = auth.signInWithPassword("first@example.test", "testpassword!");
    const newer = auth.signInWithPassword("second@example.test", "testpassword!");

    pending.get("second@example.test")?.({
      ok: true, json: async () => body("newer-token", 3600, "22222222-2222-4222-8222-222222222222")
    });
    await expect(newer).resolves.toMatchObject({ accessToken: "newer-token" });
    pending.get("first@example.test")?.({ ok: true, json: async () => body("older-token", 3600) });
    await expect(older).rejects.toThrow("cancelled or replaced");
    expect(auth.currentAuthSession()).toMatchObject({
      accessToken: "newer-token",
      userId: "22222222-2222-4222-8222-222222222222"
    });
  });

  it("does not accept a late sign-up token after signing out", async () => {
    let resolveRequest: ((response: unknown) => void) | undefined;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(resolve => { resolveRequest = resolve; })));
    const auth = await authModule();
    const pendingSignUp = auth.signUpWithPassword("first@example.test", "testpassword!");
    auth.signOut();
    resolveRequest?.({ ok: true, json: async () => body("late-signup-token", 3600) });
    await expect(pendingSignUp).rejects.toThrow("cancelled or replaced");
    expect(auth.currentAuthSession()).toBeNull();
  });
});
