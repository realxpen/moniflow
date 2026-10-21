import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";

import type { PreparationHold } from "../repositories/execution.js";
import { attachUserAuthorization } from "../security/user-authorization.js";
import { financialRecoveryRoutes } from "./financial-recovery.js";

const me = "11111111-1111-4111-8111-111111111111";
const foreign = "22222222-2222-4222-8222-222222222222";
const planId = "33333333-3333-4333-8333-333333333333";
const hold: PreparationHold = {
  planId, localUserId: me, approvedPlanHash: "f".repeat(64),
  providerBankAccountId: "SENSITIVE_BANK_IDENTIFIER", amount: 40000,
  reservedAmount: null, state: "PROVIDER_OUTCOME_UNKNOWN",
  providerProposalId: "SENSITIVE_PROPOSAL_IDENTIFIER",
  createdAt: "2026-10-21T10:00:00.000Z", updatedAt: "2026-10-21T10:00:00.000Z"
};

function fixture({ data = [hold], fail = false, ready = Promise.resolve() }: {
  data?: PreparationHold[]; fail?: boolean; ready?: Promise<void>;
} = {}) {
  const app = Fastify();
  const listPreparationHolds = vi.fn(async (_userId: string, _limit: number) => {
    if (fail) throw new Error("PRIVATE_SQL_URL_PASSWORD_AND_ACCOUNT");
    return data;
  });
  const findByPlanId = vi.fn(async () => null);
  const findById = vi.fn(async () => null);
  attachUserAuthorization(app, { audience: "authenticated" }, async token => {
    if (token !== "verified") throw new Error("BAD_TOKEN");
    return { userId: me };
  });
  app.register(financialRecoveryRoutes, {
    prefix: "/api/workspace",
    getRepositoryReady: () => ready,
    getExecutionRepository: () => ({ listPreparationHolds, findByPlanId }),
    getMoneyPlanRepository: () => ({ findById })
  });
  const get = (url = "/api/workspace/financial-recovery", token?: string) =>
    app.inject({
      method: "GET", url,
      headers: token ? { authorization: "Bearer " + token } : undefined
    });
  return { app, get, listPreparationHolds, findById, findByPlanId };
}

describe("Authenticated local financial recovery API", () => {
  it("requires a verified token and never uses a supplied user ID", async () => {
    const f = fixture();
    try {
      expect((await f.get()).statusCode).toBe(401);
      expect((await f.get(undefined, "forged")).statusCode).toBe(401);
      expect((await f.get("/api/workspace/financial-recovery?localUserId=" + foreign, "verified")).statusCode)
        .toBe(403);
      expect((await f.get("/api/workspace/financial-recovery?email=someone", "verified")).statusCode)
        .toBe(400);
      expect(f.listPreparationHolds).not.toHaveBeenCalled();
    } finally { await f.app.close(); }
  });

  it("shows only redacted locally persisted state, never a beneficiary or financial amount", async () => {
    const f = fixture();
    try {
      const response = await f.get(undefined, "verified");
      expect(response.statusCode).toBe(200);
      expect(response.headers["cache-control"]).toBe("private, no-store");
      expect(response.json()).toEqual({
        authenticated: true, userId: me, evidenceSource: "LOCAL_RECORDS_ONLY",
        providerEvidenceChecked: false, financialOperationsEnabled: false,
        automaticReleaseAllowed: false, automaticRetryAllowed: false,
        visibleCaseCount: 1, hasMore: false,
        cases: [{
          planId, recordedAt: hold.createdAt, state: "LEGACY_UNKNOWN_COMMITMENT",
          manualReviewRequired: true, automaticRetryAllowed: false,
          automaticReleaseAllowed: false
        }]
      });
      expect(f.listPreparationHolds).toHaveBeenCalledExactlyOnceWith(me, 26);
      expect(JSON.stringify(response.json())).not.toMatch(/SENSITIVE|40000|password|balance|accountHolder|bankCode/i);
    } finally { await f.app.close(); }
  });

  it("does not mistake no local holds for proof that the provider has no transactions", async () => {
    const f = fixture({ data: [] });
    try {
      const response = await f.get(undefined, "verified");
      expect(response.json()).toMatchObject({
        evidenceSource: "LOCAL_RECORDS_ONLY", providerEvidenceChecked: false,
        visibleCaseCount: 0, hasMore: false, cases: []
      });
    } finally { await f.app.close(); }
  });

  it("rejects repository results for another owner rather than serializing them", async () => {
    const f = fixture({ data: [{ ...hold, localUserId: foreign }] });
    try {
      const response = await f.get(undefined, "verified");
      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({ code: "WORKSPACE_ACCESS_DENIED" });
      expect(f.findById).not.toHaveBeenCalled();
    } finally { await f.app.close(); }
  });

  it("returns 503 with only an opaque support reference on unavailable storage", async () => {
    const f = fixture({ fail: true });
    try {
      const response = await f.get(undefined, "verified");
      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({ code: "FINANCIAL_RECOVERY_READ_UNAVAILABLE" });
      expect(response.json().reference).toMatch(/^[a-f0-9-]{36}$/);
      expect(JSON.stringify(response.json())).not.toMatch(/SQL|PRIVATE|password|ACCOUNT|stack/i);
    } finally { await f.app.close(); }
  });

  it("caps result size to 25 and keeps an explicit more-results flag", async () => {
    const data = Array.from({ length: 26 }, (_, index) => ({
      ...hold,
      planId: "33333333-3333-4333-8333-" + String(index).padStart(12, "0")
    }));
    const f = fixture({ data });
    try {
      const response = await f.get(undefined, "verified");
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ visibleCaseCount: 25, hasMore: true });
      expect(response.json().cases).toHaveLength(25);
    } finally { await f.app.close(); }
  });
});
