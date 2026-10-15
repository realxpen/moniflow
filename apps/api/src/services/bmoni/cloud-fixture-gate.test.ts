import { describe, expect, it, vi } from "vitest";

import type { BmoniGateway } from "./gateway.js";
import {
  CREATE_FIXTURE_ACK, CREATE_CUSTOM_USER_ACK, syntheticRegistrationForRun, runCloudFixtureAction, validateCloudFixtureRequest,
  type CloudFixtureSettings
} from "./cloud-fixture-gate.js";

const valid: CloudFixtureSettings = {
  action: "connectivity",
  acknowledgment: "",
  userId: "",
  githubActions: "true",
  githubEvent: "workflow_dispatch",
  githubRef: "refs/heads/main",
  financialProvider: "bmoni",
  baseUrl: "https://embedded-dev.bmoni.com",
  githubRunId: "38730012345",
  githubRunAttempt: "1"
};
type Methods = Pick<BmoniGateway,
  "getSupportedSmartWalletCurrencies" | "createUser" | "listAccountWallets" |
  "listAccountBalances" | "getKycReadiness" | "getOnboardingStatus">;
const gateway = () => ({
  getSupportedSmartWalletCurrencies: vi.fn().mockResolvedValue({ currencies: ["CNGN"] }),
  createUser: vi.fn().mockResolvedValue({ bmoniUserId: "sandbox-bunch-01" }),
  listAccountWallets: vi.fn().mockResolvedValue({ wallets: [{ private: "data" }] }),
  listAccountBalances: vi.fn().mockResolvedValue({ balance: 123456 }),
  getKycReadiness: vi.fn().mockResolvedValue({ bvn: "secret-test" }),
  getOnboardingStatus: vi.fn().mockResolvedValue({ email: "secret@test.invalid" })
});

describe("BMONI cloud sandbox fixture gate", () => {
  it("allows only manual main-branch GitHub Actions and the exact sandbox provider", () => {
    for (const change of [
      { githubActions: "false" },
      { githubRef: "refs/pull/12/merge" }, { githubRef: "refs/heads/feature" },
      { financialProvider: "moniflow-sandbox" }, { baseUrl: "https://embedded.bmoni.com" }
    ]) {
      expect(() => validateCloudFixtureRequest({ ...valid, ...change })).toThrow();
    }
  });

  it("permits only connectivity on an automatic main-branch push", () => {
    expect(validateCloudFixtureRequest({ ...valid, githubEvent: "push" })).toBe("connectivity");
    expect(() => validateCloudFixtureRequest({
      ...valid, githubEvent: "push", action: "create-fixture",
      acknowledgment: CREATE_FIXTURE_ACK
    })).toThrow("NOT_AUTHORIZED");
    expect(() => validateCloudFixtureRequest({
      ...valid, githubEvent: "push", action: "inspect-user",
      userId: "sandbox-bunch-01"
    })).toThrow("NOT_AUTHORIZED");
    expect(() => validateCloudFixtureRequest({
      ...valid, githubEvent: "push", acknowledgment: "unexpected"
    })).toThrow("UNEXPECTED_INPUT");
  });

  it("fails closed for unrecognized action and unexpected read inputs", () => {
    expect(() => validateCloudFixtureRequest({ ...valid, action: "offramp" })).toThrow("UNSUPPORTED");
    expect(() => validateCloudFixtureRequest({ ...valid, userId: "unexpected" })).toThrow("UNEXPECTED_INPUT");
  });

  it("requires exact one-action consent for known fixture creation", () => {
    for (const input of [
      { ...valid, action: "create-fixture" },
      { ...valid, action: "create-fixture", acknowledgment: "yes" },
      { ...valid, action: "create-fixture", acknowledgment: CREATE_FIXTURE_ACK, userId: "not-allowed" }
    ]) {
      expect(() => validateCloudFixtureRequest(input)).toThrow("EXPLICIT_APPROVAL");
    }
    expect(validateCloudFixtureRequest({
      ...valid, action: "create-fixture", acknowledgment: CREATE_FIXTURE_ACK
    })).toBe("create-fixture");
  });

  it("makes only a single exact test-fixture user creation call", async () => {
    const mock = gateway();
    const result = await runCloudFixtureAction({
      ...valid, action: "create-fixture", acknowledgment: CREATE_FIXTURE_ACK
    }, mock as unknown as Methods);
    expect(mock.createUser).toHaveBeenCalledExactlyOnceWith({
      firstName: "Bunch", lastName: "Dillon",
      email: "bunch.dillon@example.com", phoneNumber: "+2348000000000"
    });
    expect(mock.listAccountWallets).not.toHaveBeenCalled();
    expect(result.fixtureUserId).toBe("sandbox-bunch-01");
    expect(result.readyForDeviceProof).toBe(false);
    mock.createUser.mockRejectedValueOnce(new Error("HTTP 409"));
    await expect(runCloudFixtureAction({
      ...valid, action: "create-fixture", acknowledgment: CREATE_FIXTURE_ACK
    }, mock as unknown as Methods)).rejects.toThrow("HTTP 409");
    expect(mock.createUser).toHaveBeenCalledTimes(2);
  });

  it("requires exact manual custom registration consent and rejects every push/re-run", () => {
    const action = "create-custom-user";
    for (const patch of [
      { acknowledgment: "" }, { acknowledgment: "yes" },
      { acknowledgment: CREATE_CUSTOM_USER_ACK, githubEvent: "push" },
      { acknowledgment: CREATE_CUSTOM_USER_ACK, githubRunAttempt: "2" },
      { acknowledgment: CREATE_CUSTOM_USER_ACK, githubRunId: "bad-id" },
      { acknowledgment: CREATE_CUSTOM_USER_ACK, userId: "existing-user" }
    ]) {
      expect(() => validateCloudFixtureRequest({ ...valid, action, ...patch })).toThrow();
    }
    expect(validateCloudFixtureRequest({
      ...valid, action, acknowledgment: CREATE_CUSTOM_USER_ACK
    })).toBe("create-custom-user");
  });

  it("uses run-scoped synthetic identity, no BVN, and makes exactly one real BMONI create call", async () => {
    const profile = syntheticRegistrationForRun(valid.githubRunId);
    expect(profile.email).toBe("moniflow.sandbox.38730012345@example.com");
    expect(profile.phoneNumber).toBe("+234800" + valid.githubRunId.slice(-7));
    expect(profile).not.toHaveProperty("bvn");
    expect(profile).not.toHaveProperty("privateKey");

    const mock = gateway();
    mock.createUser.mockResolvedValueOnce({
      bmoniUserId: "bmoni-run-specific-1", email: profile.email, firstName: "Moniflow"
    });
    const outcome = await runCloudFixtureAction({
      ...valid, action: "create-custom-user", acknowledgment: CREATE_CUSTOM_USER_ACK
    }, mock as unknown as Methods);
    expect(mock.createUser).toHaveBeenCalledExactlyOnceWith(profile);
    expect(mock.listAccountWallets).not.toHaveBeenCalled();
    expect(mock.getKycReadiness).not.toHaveBeenCalled();
    expect(outcome.fixtureUserId).toBe("bmoni-run-specific-1");
    expect(outcome.syntheticIdentity).toEqual({
      email: profile.email, phoneNumber: profile.phoneNumber
    });
    expect(outcome.readyForDeviceProof).toBe(false);
  });

  it("fails closed if provider returns a different synthetic user's email", async () => {
    const mock = gateway();
    mock.createUser.mockResolvedValueOnce({
      bmoniUserId: "bmoni-user-mismatch", email: "another@example.com", firstName: "Moniflow"
    });
    await expect(runCloudFixtureAction({
      ...valid, action: "create-custom-user", acknowledgment: CREATE_CUSTOM_USER_ACK
    }, mock as unknown as Methods)).rejects.toThrow("INVALID_CUSTOM_USER_RESPONSE");
    expect(mock.createUser).toHaveBeenCalledTimes(1);
  });

  it("does not duplicate a create after a provider 409 or uncertain response", async () => {
    const mock = gateway();
    mock.createUser.mockRejectedValueOnce(new Error("HTTP 409"));
    await expect(runCloudFixtureAction({
      ...valid, action: "create-custom-user", acknowledgment: CREATE_CUSTOM_USER_ACK
    }, mock as unknown as Methods)).rejects.toThrow("HTTP 409");
    expect(mock.createUser).toHaveBeenCalledTimes(1);
  });

  it("never creates a user during health or inspection", async () => {
    const mock = gateway();
    const health = await runCloudFixtureAction(valid, mock as unknown as Methods);
    expect(health.findings).toEqual([{ stage: "bmoni-cngn-supported", pass: true }]);
    expect(mock.createUser).not.toHaveBeenCalled();

    mock.getKycReadiness.mockRejectedValueOnce(new Error("provider error with PII secret"));
    const inspection = await runCloudFixtureAction({
      ...valid, action: "inspect-user", userId: "sandbox-bunch-01"
    }, mock as unknown as Methods);
    expect(inspection.findings).toHaveLength(4);
    expect(inspection.findings.find(x => x.stage === "kyc-readiness")).toEqual({
      stage: "kyc-readiness", pass: false, reason: "provider_unavailable"
    });
    expect(JSON.stringify(inspection)).not.toMatch(/secret|123456|@/);
    expect(mock.listAccountWallets).toHaveBeenCalledWith("sandbox-bunch-01");
    expect(inspection.readyForDeviceProof).toBe(false);
    expect(mock.createUser).not.toHaveBeenCalled();
  });

  it("requires a non-empty safe BMONI ID before inspecting", () => {
    for (const id of ["", " ../../etc/passwd", "a/b", "a".repeat(129)]) {
      expect(() => validateCloudFixtureRequest({
        ...valid, action: "inspect-user", userId: id
      })).toThrow("VERIFIED_USER_ID_REQUIRED");
    }
    expect(validateCloudFixtureRequest({
      ...valid, action: "inspect-user", userId: "test_123-Abc"
    })).toBe("inspect-user");
  });
});
