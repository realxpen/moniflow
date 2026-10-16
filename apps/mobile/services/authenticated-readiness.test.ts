import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  sessionForApiRequest: vi.fn()
}));
vi.mock("@/services/api-fetch", () => ({ apiFetch: mocks.apiFetch }));
vi.mock("@/services/auth-session", () => ({ sessionForApiRequest: mocks.sessionForApiRequest }));
vi.mock("@/services/runtime", () => ({ resolveApiUrl: () => "https://moniflow-api-silk.vercel.app" }));

import { loadVerifiedApiSession } from "./authenticated-readiness";

const userId = "11111111-1111-4111-8111-111111111111";
const validPayload = {
  authenticated: true, userId, providerMappingState: "not_checked",
  walletState: "not_checked", kycState: "not_checked",
  financialOperationsEnabled: false
};
const jsonResponse = (payload: object, status = 200) => ({
  ok: status >= 200 && status < 300, status,
  headers: { get: () => "application/json" },
  json: async () => payload
});

afterEach(() => vi.clearAllMocks());

describe("read-only API session verification from native app", () => {
  it("never calls the API without an active authenticated session", async () => {
    mocks.sessionForApiRequest.mockResolvedValueOnce(null);
    await expect(loadVerifiedApiSession()).rejects.toThrow("sign in again");
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("only fetches the verified-session GET and checks the same user subject", async () => {
    mocks.sessionForApiRequest.mockResolvedValueOnce({ userId });
    mocks.apiFetch.mockResolvedValueOnce(jsonResponse(validPayload));
    expect(await loadVerifiedApiSession()).toEqual(validPayload);
    expect(mocks.apiFetch).toHaveBeenCalledExactlyOnceWith(
      "https://moniflow-api-silk.vercel.app/api/auth/session", { method: "GET" }
    );
  });

  it("rejects a signed-in session that receives a different user ID", async () => {
    mocks.sessionForApiRequest.mockResolvedValueOnce({ userId });
    mocks.apiFetch.mockResolvedValueOnce(jsonResponse({ ...validPayload, userId: "22222222-2222-4222-8222-222222222222" }));
    await expect(loadVerifiedApiSession()).rejects.toThrow("did not match");
  });

  it("refuses provider-connected, wallet-enabled or otherwise inflated readiness", async () => {
    for (const invalid of [
      { ...validPayload, walletState: "active" },
      { ...validPayload, providerMappingState: "linked" },
      { ...validPayload, kycState: "verified" },
      { ...validPayload, financialOperationsEnabled: true },
      { ...validPayload, authenticated: false }
    ]) {
      mocks.sessionForApiRequest.mockResolvedValueOnce({ userId });
      mocks.apiFetch.mockResolvedValueOnce(jsonResponse(invalid));
      await expect(loadVerifiedApiSession()).rejects.toThrow("did not match");
    }
  });

  it("reports the deployment gap without trying a financial or fallback request", async () => {
    mocks.sessionForApiRequest.mockResolvedValueOnce({ userId });
    mocks.apiFetch.mockResolvedValueOnce(jsonResponse({}, 404));
    await expect(loadVerifiedApiSession()).rejects.toThrow("not deployed");
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
  });
});
