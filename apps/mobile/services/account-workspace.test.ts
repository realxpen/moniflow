import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  sessionForApiRequest: vi.fn()
}));
vi.mock("@/services/api-fetch", () => ({ apiFetch: mocks.apiFetch }));
vi.mock("@/services/auth-session", () => ({ sessionForApiRequest: mocks.sessionForApiRequest }));
vi.mock("@/services/runtime", () => ({ resolveApiUrl: () => "https://moniflow-api-silk.vercel.app" }));

import { loadAccountWorkspace } from "./account-workspace";

const userId = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const base = {
  authenticated: true, userId, mapping: "not_linked",
  wallet: "not_created", kyc: "not_checked",
  providerReadAccess: false, financialOperationsEnabled: false,
  accountData: "withheld_until_verified"
};
const reply = (payload: object, status = 200) => ({
  status, ok: status >= 200 && status < 300,
  headers: { get: () => "application/json" },
  json: async () => payload
});
afterEach(() => vi.clearAllMocks());

describe("Phase 30 authenticated read-only account view", () => {
  it("refuses to read a financial workspace without an active session", async () => {
    mocks.sessionForApiRequest.mockResolvedValue(null);
    await expect(loadAccountWorkspace()).rejects.toThrow("Sign in again");
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("requests only the no-identifier, signed GET and returns a truthful empty account", async () => {
    mocks.sessionForApiRequest.mockResolvedValue({ userId });
    mocks.apiFetch.mockResolvedValue(reply(base));
    expect(await loadAccountWorkspace()).toEqual(base);
    expect(mocks.apiFetch).toHaveBeenCalledExactlyOnceWith(
      "https://moniflow-api-silk.vercel.app/api/workspace/overview", { method: "GET" }
    );
    expect(mocks.sessionForApiRequest).toHaveBeenCalledTimes(2);
  });

  it("rejects cross-account responses and provider readiness inflation", async () => {
    for(const invalid of [
      { ...base, userId: other },
      { ...base, authenticated: false },
      { ...base, mapping: "not_linked", wallet: "recorded_not_reverified" },
      { ...base, providerReadAccess: true },
      { ...base, financialOperationsEnabled: true },
      { ...base, accountData: "ready" },
      { ...base, kyc: "verified" }
    ]) {
      mocks.sessionForApiRequest.mockResolvedValue({ userId });
      mocks.apiFetch.mockResolvedValue(reply(invalid));
      await expect(loadAccountWorkspace()).rejects.toThrow("did not match");
    }
  });

  it("discards the response if user signs out or switches account during the request", async () => {
    mocks.sessionForApiRequest.mockResolvedValueOnce({ userId }).mockResolvedValueOnce({ userId: other });
    mocks.apiFetch.mockResolvedValueOnce(reply(base));
    await expect(loadAccountWorkspace()).rejects.toThrow("account changed");
  });

  it("displays only an opaque support reference for database failure, never raw error data", async () => {
    mocks.sessionForApiRequest.mockResolvedValue({ userId });
    const reference = "8bddde83-2aab-435e-9317-808888880001";
    mocks.apiFetch.mockResolvedValueOnce(reply({
      code: "WORKSPACE_READ_UNAVAILABLE", reference, databaseUrl: "TOP_SECRET"
    }, 503));
    await expect(loadAccountWorkspace()).rejects.toThrow("Support reference: " + reference);
    mocks.apiFetch.mockResolvedValueOnce(reply({
      code: "WORKSPACE_READ_UNAVAILABLE", reference: "SQL secret: TOP_SECRET"
    }, 503));
    await expect(loadAccountWorkspace()).rejects.toThrow("No financial data was loaded.");
    expect(mocks.apiFetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry or fall back to demo data when the API is old or fails", async () => {
    mocks.sessionForApiRequest.mockResolvedValue({ userId });
    mocks.apiFetch.mockResolvedValueOnce(reply({}, 404));
    await expect(loadAccountWorkspace()).rejects.toThrow("not deployed");
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
    mocks.apiFetch.mockResolvedValueOnce(reply({}, 503));
    await expect(loadAccountWorkspace()).rejects.toThrow("could not be verified");
    expect(mocks.apiFetch).toHaveBeenCalledTimes(2);
  });
});
