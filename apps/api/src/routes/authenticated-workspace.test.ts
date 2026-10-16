import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";

import { attachUserAuthorization } from "../security/user-authorization.js";
import { authenticatedWorkspaceRoutes } from "./authenticated-workspace.js";

const me = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";

async function fixture({
  mapping = null as null | { localUserId: string },
  wallet = null as null | { localUserId: string },
  failure = false
} = {}) {
  const app = Fastify();
  const mappingRead = vi.fn(async (_id: string) => {
    if (failure) throw new Error("DATABASE_UNAVAILABLE");
    return mapping;
  });
  const walletRead = vi.fn(async (_id: string) => wallet);
  const providerCall = vi.fn(() => { throw new Error("MUST_NEVER_CALL_PROVIDER"); });

  attachUserAuthorization(app, { audience: "authenticated" }, async token => {
    if (token !== "verified-me") throw new Error("INVALID_TOKEN");
    return { userId: me };
  });
  await app.register(authenticatedWorkspaceRoutes, {
    prefix: "/api/workspace",
    getBmoniUserService: () => ({ getMapping: mappingRead }) as never,
    getWalletOwnershipRepository: () => ({ findByLocalUserId: walletRead }) as never
  });
  return { app, mappingRead, walletRead, providerCall };
}

describe("Phase 30 authenticated owner-scoped workspace status", () => {
  it("denies anonymous, forged token and foreign workspace ID before database access", async () => {
    const { app, mappingRead, walletRead } = await fixture();
    try {
      expect((await app.inject({ method: "GET", url: "/api/workspace/overview" })).statusCode).toBe(401);
      expect((await app.inject({
        method: "GET", url: "/api/workspace/overview", headers: { authorization: "Bearer forged" }
      })).statusCode).toBe(401);
      expect((await app.inject({
        method: "GET", url: "/api/workspace/overview?localUserId=" + other,
        headers: { authorization: "Bearer verified-me" }
      })).statusCode).toBe(403);
      expect(mappingRead).not.toHaveBeenCalled();
      expect(walletRead).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });

  it("returns truthful empty account without querying wallet or contacting BMONI", async () => {
    const { app, mappingRead, walletRead, providerCall } = await fixture();
    try {
      const response = await app.inject({
        method: "GET", url: "/api/workspace/overview",
        headers: { authorization: "Bearer verified-me" }
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers["cache-control"]).toBe("private, no-store");
      expect(response.json()).toEqual({
        authenticated: true, userId: me, mapping: "not_linked",
        wallet: "not_created", kyc: "not_checked", providerReadAccess: false,
        financialOperationsEnabled: false, accountData: "withheld_until_verified"
      });
      expect(mappingRead).toHaveBeenCalledExactlyOnceWith(me);
      expect(walletRead).not.toHaveBeenCalled();
      expect(providerCall).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });

  it("only reports persisted records, never asserts live owner proof or KYC", async () => {
    const { app, walletRead } = await fixture({ mapping: { localUserId: me }, wallet: { localUserId: me } });
    try {
      const response = await app.inject({
        method: "GET", url: "/api/workspace/overview",
        headers: { authorization: "Bearer verified-me" }
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        mapping: "recorded", wallet: "recorded_not_reverified",
        kyc: "not_checked", providerReadAccess: false, financialOperationsEnabled: false
      });
      expect(walletRead).toHaveBeenCalledExactlyOnceWith(me);
      expect(JSON.stringify(response.json())).not.toMatch(/bmoniUserId|ownerAddress|smartWalletAddress|balance|email|phone/i);
    } finally { await app.close(); }
  });

  it("fails closed on a mapping or wallet returned for a different user", async () => {
    for (const situation of [
      { mapping: { localUserId: other }, wallet: null },
      { mapping: { localUserId: me }, wallet: { localUserId: other } }
    ]) {
      const { app } = await fixture(situation);
      try {
        const result = await app.inject({
          method: "GET", url: "/api/workspace/overview",
          headers: { authorization: "Bearer verified-me" }
        });
        expect(result.statusCode).toBe(403);
        expect(result.json()).toEqual({ code: "WORKSPACE_ACCESS_DENIED" });
      } finally { await app.close(); }
    }
  });

  it("does not turn a database outage into a fictional empty account", async () => {
    const { app } = await fixture({ failure: true });
    try {
      const result = await app.inject({
        method: "GET", url: "/api/workspace/overview",
        headers: { authorization: "Bearer verified-me" }
      });
      expect(result.statusCode).toBe(503);
      expect(result.json()).toEqual({ code: "WORKSPACE_READ_UNAVAILABLE" });
    } finally { await app.close(); }
  });

  it("refuses to treat an unsigned local development server as authenticated", async () => {
    const app = Fastify();
    await app.register(authenticatedWorkspaceRoutes, {
      prefix: "/api/workspace",
      getBmoniUserService: () => ({ getMapping: vi.fn() }) as never,
      getWalletOwnershipRepository: () => ({ findByLocalUserId: vi.fn() }) as never
    });
    try {
      expect((await app.inject({
        method: "GET", url: "/api/workspace/overview",
        headers: { authorization: "Bearer fake" }
      })).statusCode).toBe(401);
    } finally { await app.close(); }
  });
});
