import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";

import { attachUserAuthorization } from "../security/user-authorization.js";
import { identityReconciliationRoutes } from "./identity-reconciliation.js";

const me = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const headers = { authorization: "Bearer verified-me" };

async function fixture({
  mapping = null as null | { localUserId: string; email?: string; bmoniUserId?: string },
  hold = null as null | { localUserId: string | null; state: "PROVIDER_USER_EXISTS" | "PROVIDER_OUTCOME_UNKNOWN" },
  fail = "" as "" | "ready" | "mapping" | "hold"
} = {}) {
  const app = Fastify();
  const getMapping = vi.fn(async (_id: string) => {
    if (fail === "mapping") throw new Error("PRIVATE DATABASE ERROR");
    return mapping;
  });
  const getReconciliationHold = vi.fn(async (_id: string) => {
    if (fail === "hold") throw new Error("PRIVATE DATABASE ERROR");
    return hold;
  });
  const providerCreate = vi.fn(() => { throw new Error("PROVIDER MUST NOT BE CALLED"); });
  attachUserAuthorization(app, { audience: "authenticated" }, async token => {
    if (token !== "verified-me") throw new Error("INVALID_TOKEN");
    return { userId: me };
  });
  await app.register(identityReconciliationRoutes, {
    prefix: "/api/workspace",
    getRepositoryReady: async () => { if (fail === "ready") throw new Error("PRIVATE DATABASE ERROR"); },
    getBmoniUserService: () => ({ getMapping, getReconciliationHold }) as never
  });
  return { app, getMapping, getReconciliationHold, providerCreate };
}

describe("Phase 32 owner-scoped reconciliation readiness", () => {
  it("requires verified JWT and denies foreign user ID before storage access", async () => {
    const { app, getMapping, getReconciliationHold } = await fixture();
    try {
      expect((await app.inject({ url: "/api/workspace/reconciliation" })).statusCode).toBe(401);
      expect((await app.inject({ url: "/api/workspace/reconciliation", headers: { authorization: "Bearer forged" } })).statusCode).toBe(401);
      expect((await app.inject({ url: "/api/workspace/reconciliation?localUserId=" + other, headers })).statusCode).toBe(403);
      expect(getMapping).not.toHaveBeenCalled();
      expect(getReconciliationHold).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });

  it("shows only conservative evidence-required state when no local record exists", async () => {
    const { app, getMapping, getReconciliationHold, providerCreate } = await fixture();
    try {
      const result = await app.inject({ url: "/api/workspace/reconciliation", headers });
      expect(result.statusCode).toBe(200);
      expect(result.headers["cache-control"]).toBe("private, no-store");
      expect(result.json()).toEqual({
        authenticated: true,
        userId: me,
        mapping: "not_linked",
        reconciliation: "identity_evidence_required",
        identityEvidence: "not_collected",
        providerOwnershipVerified: false,
        automaticLinkingEnabled: false,
        financialOperationsEnabled: false
      });
      expect(getMapping).toHaveBeenCalledExactlyOnceWith(me);
      expect(getReconciliationHold).toHaveBeenCalledExactlyOnceWith(me);
      expect(providerCreate).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });

  it("does not promote a persisted mapping into verified provider ownership", async () => {
    const { app } = await fixture({ mapping: { localUserId: me, email: "private@example.test", bmoniUserId: "synthetic-provider-id" } });
    try {
      const result = await app.inject({ url: "/api/workspace/reconciliation", headers });
      expect(result.statusCode).toBe(200);
      expect(result.json()).toMatchObject({
        mapping: "recorded_unverified", reconciliation: "unverified_mapping",
        providerOwnershipVerified: false, automaticLinkingEnabled: false,
        financialOperationsEnabled: false
      });
      expect(result.body).not.toMatch(/private@example\.test|synthetic-provider-id|phone|fingerprint|balance|wallet/i);
    } finally { await app.close(); }
  });

  it.each(["PROVIDER_USER_EXISTS", "PROVIDER_OUTCOME_UNKNOWN"] as const)(
    "requires manual review when an owner has a %s reservation", async state => {
      const { app } = await fixture({ hold: { localUserId: me, state } });
      try {
        const result = await app.inject({ url: "/api/workspace/reconciliation", headers });
        expect(result.statusCode).toBe(200);
        expect(result.json()).toMatchObject({
          mapping: "not_linked", reconciliation: "manual_review_required",
          automaticLinkingEnabled: false, financialOperationsEnabled: false
        });
        expect(result.body).not.toContain(state);
      } finally { await app.close(); }
    }
  );

  it("fails shut if storage returns another user's mapping or hold", async () => {
    for (const data of [
      { mapping: { localUserId: other }, hold: null },
      { mapping: null, hold: { localUserId: other, state: "PROVIDER_USER_EXISTS" as const } },
      { mapping: null, hold: { localUserId: null, state: "PROVIDER_OUTCOME_UNKNOWN" as const } }
    ]) {
      const { app } = await fixture(data);
      try {
        const result = await app.inject({ url: "/api/workspace/reconciliation", headers });
        expect(result.statusCode).toBe(403);
        expect(result.json()).toEqual({ code: "WORKSPACE_ACCESS_DENIED" });
      } finally { await app.close(); }
    }
  });

  it.each(["ready", "mapping", "hold"] as const)(
    "fails closed and redacts database details when %s lookup fails", async fail => {
      const { app } = await fixture({ fail });
      try {
        const result = await app.inject({ url: "/api/workspace/reconciliation", headers });
        expect(result.statusCode).toBe(503);
        expect(result.json().code).toBe("RECONCILIATION_READ_UNAVAILABLE");
        expect(result.json().reference).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        expect(result.body).not.toMatch(/PRIVATE DATABASE ERROR|connection|postgres|email/i);
      } finally { await app.close(); }
    }
  );
});
