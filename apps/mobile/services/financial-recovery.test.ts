import { describe, expect, it } from "vitest";

import { financialRecoveryDescriptions, validateFinancialRecoveryPayload } from "./financial-recovery.js";

const me = "11111111-1111-4111-8111-111111111111";
const record = {
  planId: "33333333-3333-4333-8333-333333333333",
  recordedAt: "2026-10-21T10:00:00.000Z",
  state: "PROVIDER_OUTCOME_UNKNOWN",
  manualReviewRequired: true, automaticRetryAllowed: false, automaticReleaseAllowed: false
};
const source = {
  authenticated: true, userId: me, evidenceSource: "LOCAL_RECORDS_ONLY",
  providerEvidenceChecked: false, financialOperationsEnabled: false,
  automaticReleaseAllowed: false, automaticRetryAllowed: false,
  visibleCaseCount: 1, hasMore: false, cases: [record]
};

describe("Owner-visible read-only financial recovery contract", () => {
  it("accepts only unverified local evidence for the current signed-in subject", () => {
    expect(validateFinancialRecoveryPayload(source, me)).toEqual(source);
    expect(validateFinancialRecoveryPayload(source, me.toUpperCase())).toEqual(source);
  });

  it("refuses another account and provider-confirmation or payment-unlock claims", () => {
    for (const payload of [
      { ...source, userId: "22222222-2222-4222-8222-222222222222" },
      { ...source, authenticated: false },
      { ...source, evidenceSource: "PROVIDER_CONFIRMED" },
      { ...source, providerEvidenceChecked: true },
      { ...source, financialOperationsEnabled: true },
      { ...source, automaticReleaseAllowed: true },
      { ...source, automaticRetryAllowed: true },
      { ...source, cases: [{ ...record, automaticReleaseAllowed: true }] },
      { ...source, cases: [{ ...record, manualReviewRequired: false }] },
      { ...source, cases: [{ ...record, state: "SETTLED" }] }
    ]) {
      expect(() => validateFinancialRecoveryPayload(payload, me)).toThrow();
    }
  });

  it("refuses malformed or oversized recovery responses", () => {
    for (const value of [
      null, [], "hello",
      { ...source, visibleCaseCount: 2 },
      { ...source, hasMore: "yes" },
      { ...source, cases: [{ ...record, planId: "not-a-uuid" }] },
      { ...source, cases: [{ ...record, recordedAt: "today" }] },
      { ...source, cases: Array.from({ length: 26 }, () => record) }
    ]) {
      expect(() => validateFinancialRecoveryPayload(value, me)).toThrow();
    }
  });

  it("explains every status without suggesting locally recorded completion is provider settlement", () => {
    const all = Object.values(financialRecoveryDescriptions).map(x => x.title + " " + x.detail).join("\n");
    expect(all).toMatch(/provider|local/i);
    expect(financialRecoveryDescriptions.LOCAL_COMPLETION_RECORDED.detail)
      .toMatch(/not checked/i);
    expect(financialRecoveryDescriptions.PREPARATION_UNCONFIRMED.detail)
      .toMatch(/did not record/i);
  });
});
