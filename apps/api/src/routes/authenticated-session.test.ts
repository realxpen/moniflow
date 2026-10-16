import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";

import { attachUserAuthorization } from "../security/user-authorization.js";
import { authenticatedSessionRoutes } from "./authenticated-session.js";

const userId = "11111111-1111-4111-8111-111111111111";
const foreignId = "22222222-2222-4222-8222-222222222222";

describe("authenticated read-only session proof", () => {
  it("rejects anonymous callers and never accepts a spoofed userId from query", async () => {
    const app = Fastify();
    const verify = vi.fn(async (token: string) => {
      if (token !== "signed-valid-fixture") throw new Error("INVALID_TOKEN");
      return { userId };
    });
    attachUserAuthorization(app, { audience: "authenticated" }, verify);
    await app.register(authenticatedSessionRoutes, { prefix: "/api/auth" });
    try {
      expect((await app.inject({ method: "GET", url: "/api/auth/session" })).statusCode).toBe(401);
      expect((await app.inject({
        method: "GET", url: "/api/auth/session", headers: { authorization: "Bearer invalid" }
      })).statusCode).toBe(401);
      const forbidden = await app.inject({
        method: "GET", url: "/api/auth/session?localUserId=" + foreignId,
        headers: { authorization: "Bearer signed-valid-fixture" }
      });
      expect(forbidden.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });

  it("returns only a signed user subject and explicit unchecked provider states", async () => {
    const app = Fastify();
    const verify = vi.fn(async () => ({ userId }));
    attachUserAuthorization(app, { audience: "authenticated" }, verify);
    await app.register(authenticatedSessionRoutes, { prefix: "/api/auth" });
    try {
      const response = await app.inject({
        method: "GET", url: "/api/auth/session",
        headers: { authorization: "Bearer signed-fixture" }
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers["cache-control"]).toBe("no-store, private");
      expect(response.json()).toEqual({
        authenticated: true, userId,
        providerMappingState: "not_checked", walletState: "not_checked",
        kycState: "not_checked", financialOperationsEnabled: false
      });
      expect(JSON.stringify(response.json())).not.toMatch(/balance|bmoniUserId|walletAddress|email|accessToken/i);
      expect(verify).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });

  it("fails closed in a development server without production JWT middleware", async () => {
    const app = Fastify();
    await app.register(authenticatedSessionRoutes, { prefix: "/api/auth" });
    try {
      const response = await app.inject({
        method: "GET", url: "/api/auth/session",
        headers: { authorization: "Bearer arbitrary-unsigned-value" }
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ code: "AUTH_REQUIRED" });
    } finally {
      await app.close();
    }
  });
});
