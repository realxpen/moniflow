import { generateKeyPairSync, sign } from "node:crypto";

import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { attachUserAuthorization, createSupabaseJwtVerifier } from "./user-authorization.js";

const apps: ReturnType<typeof Fastify>[] = [];
const userId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const issuer = "https://example.supabase.co/auth/v1";
const settings = { issuer, jwksUrl: issuer + "/.well-known/jwks.json", audience: "authenticated" };

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(apps.splice(0).map(a => a.close()));
});

function fixture() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const key = { ...publicKey.export({ format: "jwk" }), kid: "safe-test-key", alg: "RS256", use: "sig" };
  function token(overrides: Record<string, unknown> = {}) {
    const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "safe-test-key", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({
      iss: issuer, aud: "authenticated", sub: userId, role: "authenticated",
      iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300, ...overrides
    })).toString("base64url");
    const signingInput = header + "." + body;
    const signature = sign("sha256", Buffer.from(signingInput), privateKey).toString("base64url");
    return signingInput + "." + signature;
  }
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ keys: [key] }) }));
  return { token };
}

function appWithAuth() {
  const app = Fastify();
  apps.push(app);
  attachUserAuthorization(app, settings);
  app.get("/health/provider", async () => ({ status: "ok" }));
  app.get("/api/wallet/balance", async () => ({ balance: "test" }));
  app.post("/api/operator/plans/:planId/approve", async () => ({ accepted: true }));
  app.post("/api/onboarding/user", async request => ({ body: request.body }));
  app.get("/api/new-private-route", async () => ({ private: true }));
  return app;
}

describe("signed user authorization", () => {
  it("leaves only known health paths public", async () => {
    const app = appWithAuth();
    expect((await app.inject({ method: "GET", url: "/health/provider" })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/new-private-route" })).statusCode).toBe(401);
  });
  it("denies a request with no token and with an invalid token", async () => {
    fixture();
    const app = appWithAuth();
    expect((await app.inject({ method: "GET", url: "/api/wallet/balance?localUserId=" + userId })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/api/wallet/balance?localUserId=" + userId, headers: { authorization: "Bearer no.invalid.token" } })).statusCode).toBe(401);
  });
  it("accepts a valid signed identity and rejects cross-user balance and approval requests", async () => {
    const { token } = fixture();
    const app = appWithAuth();
    const authorization = "Bearer " + token();
    expect((await app.inject({ method: "GET", url: "/api/wallet/balance?localUserId=" + userId, headers: { authorization } })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/wallet/balance?localUserId=" + otherId, headers: { authorization } })).statusCode).toBe(403);
    const approval = await app.inject({
      method: "POST", url: "/api/operator/plans/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/approve",
      headers: { authorization, "content-type": "application/json" },
      payload: { localUserId: otherId }
    });
    expect(approval.statusCode).toBe(403);
  });
  it("binds onboarding to the verified subject", async () => {
    const { token } = fixture();
    const app = appWithAuth();
    const response = await app.inject({
      method: "POST", url: "/api/onboarding/user",
      headers: { authorization: "Bearer " + token(), "content-type": "application/json" },
      payload: { firstName: "Test" }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().body.localUserId).toBe(userId);
  });
  it("rejects expired tokens, wrong audience, and wrong issuer", async () => {
    const { token } = fixture();
    const verifier = createSupabaseJwtVerifier(settings);
    await expect(verifier(token({ exp: 1 }))).rejects.toThrow();
    await expect(verifier(token({ aud: "another" }))).rejects.toThrow();
    await expect(verifier(token({ iss: "https://other.supabase.co/auth/v1" }))).rejects.toThrow();
  });
  it("fails closed if auth configuration is absent", async () => {
    const app = Fastify(); apps.push(app);
    attachUserAuthorization(app, { audience: "authenticated" });
    app.get("/api/private", async () => ({ ok: true }));
    expect((await app.inject({ method: "GET", url: "/api/private" })).statusCode).toBe(503);
  });
});
