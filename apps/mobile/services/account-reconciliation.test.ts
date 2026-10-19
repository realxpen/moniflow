import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  sessionForApiRequest: vi.fn()
}));
vi.mock("@/services/api-fetch", () => ({ apiFetch: mocks.apiFetch }));
vi.mock("@/services/auth-session", () => ({ sessionForApiRequest: mocks.sessionForApiRequest }));
vi.mock("@/services/runtime", () => ({ resolveApiUrl: () => "https://moniflow-api-silk.vercel.app" }));

import { loadAccountReconciliation } from "./account-reconciliation";

const me = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const workspace = {
  authenticated: true as const, userId: me, mapping: "not_linked" as const,
  wallet: "not_created" as const, kyc: "not_checked" as const,
  providerReadAccess: false as const, financialOperationsEnabled: false as const,
  accountData: "withheld_until_verified" as const
};
const success = {
  authenticated: true, userId: me, mapping: "not_linked",
  reconciliation: "identity_evidence_required", identityEvidence: "not_collected",
  providerOwnershipVerified: false, automaticLinkingEnabled: false, financialOperationsEnabled: false
};
const reply = (data: object, status = 200, contentType = "application/json") => ({
  status, ok: status >= 200 && status < 300,
  headers: { get: () => contentType }, json: async () => data
});
afterEach(() => vi.clearAllMocks());

describe("Phase 33 Android read-only reconciliation view", () => {
  it("requires the signed-in owner and never reads a foreign workspace", async () => {
    mocks.sessionForApiRequest.mockResolvedValue(null);
    await expect(loadAccountReconciliation(workspace)).rejects.toThrow("Sign in again");
    mocks.sessionForApiRequest.mockResolvedValue({ userId: other });
    await expect(loadAccountReconciliation(workspace)).rejects.toThrow("Sign in again");
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });
  it("uses only authenticated GET and reports evidence-required without linking", async () => {
    mocks.sessionForApiRequest.mockResolvedValue({ userId: me });
    mocks.apiFetch.mockResolvedValue(reply(success));
    expect(await loadAccountReconciliation(workspace)).toEqual(success);
    expect(mocks.apiFetch).toHaveBeenCalledExactlyOnceWith(
      "https://moniflow-api-silk.vercel.app/api/workspace/reconciliation", { method: "GET" }
    );
    expect(mocks.sessionForApiRequest).toHaveBeenCalledTimes(2);
  });
  it("accepts a manual hold but never treats recorded mapping as verified ownership", async () => {
    mocks.sessionForApiRequest.mockResolvedValue({ userId: me });
    mocks.apiFetch.mockResolvedValueOnce(reply({ ...success, reconciliation: "manual_review_required" }));
    expect((await loadAccountReconciliation(workspace)).reconciliation).toBe("manual_review_required");
    mocks.apiFetch.mockResolvedValueOnce(reply({
      ...success, mapping: "recorded_unverified", reconciliation: "unverified_mapping"
    }));
    expect((await loadAccountReconciliation({ ...workspace, mapping: "recorded", wallet: "recorded_not_reverified" }))
      .providerOwnershipVerified).toBe(false);
  });
  it("rejects foreign identities, inconsistent mapping, impossible state and inflated privileges", async () => {
    for (const invalid of [
      { ...success, userId: other },
      { ...success, authenticated: false },
      { ...success, mapping: "recorded_unverified" },
      { ...success, reconciliation: "unverified_mapping" },
      { ...success, reconciliation: "verified" },
      { ...success, identityEvidence: "verified" },
      { ...success, providerOwnershipVerified: true },
      { ...success, automaticLinkingEnabled: true },
      { ...success, financialOperationsEnabled: true }
    ]) {
      mocks.sessionForApiRequest.mockResolvedValue({ userId: me });
      mocks.apiFetch.mockResolvedValue(reply(invalid));
      await expect(loadAccountReconciliation(workspace)).rejects.toThrow("did not match");
    }
  });
  it("does not leak raw database messages or secret IDs from 503 responses", async () => {
    mocks.sessionForApiRequest.mockResolvedValue({ userId: me });
    const reference = "8bddde83-2aab-435e-9317-808888880001";
    mocks.apiFetch.mockResolvedValueOnce(reply({
      code: "RECONCILIATION_READ_UNAVAILABLE", reference, secret: "PRIVATE_VALUE"
    }, 503));
    await expect(loadAccountReconciliation(workspace)).rejects.toThrow("Support reference: " + reference);
    mocks.apiFetch.mockResolvedValueOnce(reply({
      code: "RECONCILIATION_READ_UNAVAILABLE", reference: "PRIVATE_SQL"
    }, 503));
    await expect(loadAccountReconciliation(workspace)).rejects.toThrow("temporarily unavailable");
    expect(mocks.apiFetch).toHaveBeenCalledTimes(2);
  });
  it("refuses old API releases, unexpected content and session changes", async () => {
    mocks.sessionForApiRequest.mockResolvedValue({ userId: me });
    mocks.apiFetch.mockResolvedValueOnce(reply({}, 404));
    await expect(loadAccountReconciliation(workspace)).rejects.toThrow("not available");
    mocks.apiFetch.mockResolvedValueOnce(reply(success, 200, "text/html"));
    await expect(loadAccountReconciliation(workspace)).rejects.toThrow("could not be verified");
    mocks.sessionForApiRequest.mockReset().mockResolvedValueOnce({ userId: me })
      .mockResolvedValueOnce({ userId: other });
    mocks.apiFetch.mockResolvedValueOnce(reply(success));
    await expect(loadAccountReconciliation(workspace)).rejects.toThrow("account changed");
  });
});
