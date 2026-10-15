import { describe, expect, it, vi } from "vitest";
import type { BmoniGateway } from "./gateway.js";
import { assertSharedKeyLabAllowed, runSharedKeyLab } from "./shared-key-lab.js";

const env = {
  MONIFLOW_SHARED_KEY_LAB_ENABLED: "true",
  NODE_ENV: "development",
  BMONI_LAB_USER_ID: "bmoni-test-user-123",
  BMONI_LAB_OWNER_ADDRESS: "0x1234567890123456789012345678901234567890",
  BMONI_LAB_CHALLENGE_ID: "test-challenge-123",
  BMONI_LAB_OWNER_PROOF_SIGNATURE: "0x" + "a".repeat(130),
  MONIFLOW_SHARED_KEY_LAB_ALLOW_WRITES: "true",
  MONIFLOW_SHARED_KEY_LAB_CONFIRM: "AUTHORIZE_ONE_SANDBOX_USER"
};
const mock = () => ({
  getSupportedSmartWalletCurrencies: vi.fn().mockResolvedValue({ currencies: ["CNGN"] }),
  createUser: vi.fn().mockResolvedValue({ bmoniUserId: "returned-bmoni-test-user" }),
  createOwnerProofChallenge: vi.fn().mockResolvedValue({ challengeId: "challenge-xyz", message: "sign this exact message" }),
  createManagedSmartWallet: vi.fn().mockResolvedValue({ smartWalletId: "wallet-xyz", status: "active" }),
  listAccountWallets: vi.fn().mockResolvedValue([{ address: "secret-address" }]),
  listAccountBalances: vi.fn().mockResolvedValue({ privateBalance: 1000 }),
  getKycReadiness: vi.fn().mockResolvedValue({ bvn: "sensitive" }),
  getOnboardingStatus: vi.fn().mockResolvedValue({ id: "private" }),
  getNigerianBanks: vi.fn().mockResolvedValue({ banks: ["TEST"] })
});
type Gateway = Pick<BmoniGateway, keyof ReturnType<typeof mock>>;

describe("controlled BMONI shared-key lab", () => {
  it("stays opt-in, local only, and cannot run as a production, Vercel, or CI task", () => {
    expect(() => assertSharedKeyLabAllowed("health", {})).toThrow("LAB_DISABLED");
    for (const changes of [
      { NODE_ENV: "production" }, { CI: "true" },
      { GITHUB_ACTIONS: "true" }, { VERCEL: "1" },
      { MONIFLOW_SHARED_KEY_LAB_ENABLED: "false" }
    ]) {
      expect(() => assertSharedKeyLabAllowed("health", { ...env, ...changes })).toThrow("LAB_DISABLED");
    }
    expect(assertSharedKeyLabAllowed("health", env)).toBe("health");
    expect(() => assertSharedKeyLabAllowed("arbitrary-action", env)).toThrow("LAB_UNKNOWN_COMMAND");
  });

  it("requires action-specific approval and a local write switch", () => {
    for (const action of ["create-user", "owner-proof", "create-wallet"]) {
      expect(() => assertSharedKeyLabAllowed(action, {
        ...env, MONIFLOW_SHARED_KEY_LAB_ALLOW_WRITES: "false"
      })).toThrow("LAB_WRITE_NOT_APPROVED");
      expect(() => assertSharedKeyLabAllowed(action, {
        ...env, MONIFLOW_SHARED_KEY_LAB_CONFIRM: "WRONG"
      })).toThrow("LAB_WRITE_NOT_APPROVED");
    }
    expect(assertSharedKeyLabAllowed("create-user", env)).toBe("create-user");
    expect(assertSharedKeyLabAllowed("owner-proof", {
      ...env, MONIFLOW_SHARED_KEY_LAB_CONFIRM: "AUTHORIZE_ONE_SANDBOX_CHALLENGE"
    })).toBe("owner-proof");
    expect(assertSharedKeyLabAllowed("create-wallet", {
      ...env, MONIFLOW_SHARED_KEY_LAB_CONFIRM: "AUTHORIZE_ONE_SANDBOX_WALLET"
    })).toBe("create-wallet");
  });

  it("validates user, address, challenge and device-signature prerequisites", () => {
    expect(() => assertSharedKeyLabAllowed("inspect", { ...env, BMONI_LAB_USER_ID: "" })).toThrow("LAB_USER_ID_REQUIRED");
    expect(() => assertSharedKeyLabAllowed("owner-proof", {
      ...env, BMONI_LAB_OWNER_ADDRESS: "malformed"
    })).toThrow("LAB_OWNER_ADDRESS_REQUIRED");
    expect(() => assertSharedKeyLabAllowed("create-wallet", {
      ...env, BMONI_LAB_OWNER_PROOF_SIGNATURE: "0xsecret",
      MONIFLOW_SHARED_KEY_LAB_CONFIRM: "AUTHORIZE_ONE_SANDBOX_WALLET"
    })).toThrow("LAB_OWNER_PROOF_REQUIRED");
  });

  it("health performs exactly one documented read with no writes", async () => {
    const gateway = mock();
    const result = await runSharedKeyLab("health", gateway as unknown as Gateway, env);
    expect(result).toMatchObject({ sandbox: true, provider: "BMONI", results: [
      { stage: "supported-currencies", ok: true, currencies: ["CNGN"] }
    ] });
    expect(gateway.getSupportedSmartWalletCurrencies).toHaveBeenCalledOnce();
    expect(gateway.createUser).not.toHaveBeenCalled();
    expect(gateway.createManagedSmartWallet).not.toHaveBeenCalled();
  });

  it("inspects only one operator-designated identity, never echoes provider PII or funds", async () => {
    const gateway = mock();
    gateway.getKycReadiness.mockRejectedValueOnce(new Error("sensitive upstream error"));
    const result = await runSharedKeyLab("inspect", gateway as unknown as Gateway, env);
    expect(result.results).toHaveLength(5);
    expect(result.results.find(x => x.stage === "kyc-readiness")).toEqual({ stage: "kyc-readiness", ok: false });
    expect(JSON.stringify(result)).not.toMatch(/secret-address|sensitive|1000/);
    expect(gateway.listAccountBalances).toHaveBeenCalledWith("bmoni-test-user-123");
    expect(gateway.createUser).not.toHaveBeenCalled();
  });

  it("creates only the BMONI documented Bunch Dillon fixture and never retries", async () => {
    const gateway = mock();
    const result = await runSharedKeyLab("create-user", gateway as unknown as Gateway, env);
    expect(gateway.createUser).toHaveBeenCalledExactlyOnceWith({
      firstName: "Bunch", lastName: "Dillon",
      email: "bunch.dillon@example.com", phoneNumber: "+2348000000000"
    });
    expect(result.results[0]).toMatchObject({ ok: true, bmoniUserId: "returned-bmoni-test-user" });
    gateway.createUser.mockReset().mockRejectedValueOnce(new Error("409 conflict"));
    await expect(runSharedKeyLab("create-user", gateway as unknown as Gateway, env)).rejects.toThrow("409 conflict");
    expect(gateway.createUser).toHaveBeenCalledTimes(1);
  });

  it("returns the challenge to an external signer without accepting or generating a private key", async () => {
    const gateway = mock();
    const values = { ...env, MONIFLOW_SHARED_KEY_LAB_CONFIRM: "AUTHORIZE_ONE_SANDBOX_CHALLENGE" };
    const result = await runSharedKeyLab("owner-proof", gateway as unknown as Gateway, values);
    expect(gateway.createOwnerProofChallenge).toHaveBeenCalledWith(values.BMONI_LAB_USER_ID, {
      currency: "CNGN", userOwnerAddress: values.BMONI_LAB_OWNER_ADDRESS
    });
    expect(result.results[0]).toMatchObject({ challengeId: "challenge-xyz", message: "sign this exact message" });
    expect(gateway.createManagedSmartWallet).not.toHaveBeenCalled();
  });

  it("wallet registration accepts only an existing device-produced proof", async () => {
    const gateway = mock();
    const values = { ...env, MONIFLOW_SHARED_KEY_LAB_CONFIRM: "AUTHORIZE_ONE_SANDBOX_WALLET" };
    const result = await runSharedKeyLab("create-wallet", gateway as unknown as Gateway, values);
    expect(gateway.createManagedSmartWallet).toHaveBeenCalledWith(values.BMONI_LAB_USER_ID, {
      currency: "CNGN",
      userOwnerAddress: values.BMONI_LAB_OWNER_ADDRESS,
      ownerProofChallengeId: values.BMONI_LAB_CHALLENGE_ID,
      ownerProofSignature: values.BMONI_LAB_OWNER_PROOF_SIGNATURE
    });
    expect(result.results[0]).toEqual({
      stage: "provider-wallet-response", ok: true, smartWalletId: "wallet-xyz", status: "active"
    });
    expect(JSON.stringify(result)).not.toContain(values.BMONI_LAB_OWNER_PROOF_SIGNATURE);
  });
});
