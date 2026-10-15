import type { BmoniGateway } from "./gateway.js";

export type SharedKeyLabCommand = "health" | "inspect" | "create-user" | "owner-proof" | "create-wallet";
export type LabResult = {
  command: SharedKeyLabCommand;
  sandbox: true;
  provider: "BMONI";
  results: Array<Record<string, string | boolean | string[]>>;
};

const SUPPORTED = new Set<SharedKeyLabCommand>(["health", "inspect", "create-user", "owner-proof", "create-wallet"]);
const WRITE_ACK: Record<string, string> = {
  "create-user": "AUTHORIZE_ONE_SANDBOX_USER",
  "owner-proof": "AUTHORIZE_ONE_SANDBOX_CHALLENGE",
  "create-wallet": "AUTHORIZE_ONE_SANDBOX_WALLET"
};
const BUNCH = Object.freeze({
  firstName: "Bunch",
  lastName: "Dillon",
  email: "bunch.dillon@example.com",
  phoneNumber: "+2348000000000"
});
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const OWNER_SIGNATURE = /^0x[a-fA-F0-9]{130}$/;
const PERSON_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function assertSharedKeyLabAllowed(
  action: string | undefined, values: Record<string, string | undefined>
): SharedKeyLabCommand {
  if (!action || !SUPPORTED.has(action as SharedKeyLabCommand)) {
    throw new Error("LAB_UNKNOWN_COMMAND: Choose health, inspect, create-user, owner-proof, or create-wallet.");
  }
  const command = action as SharedKeyLabCommand;
  if (values.MONIFLOW_SHARED_KEY_LAB_ENABLED !== "true" ||
      values.NODE_ENV === "production" || values.CI === "true" ||
      values.GITHUB_ACTIONS === "true" || Boolean(values.VERCEL)) {
    throw new Error("LAB_DISABLED: Available only from an explicitly enabled local development terminal.");
  }
  if (command !== "health" && !PERSON_ID.test(values.BMONI_LAB_USER_ID ?? "") &&
      command !== "create-user") {
    throw new Error("LAB_USER_ID_REQUIRED: Set BMONI_LAB_USER_ID to an existing sandbox identity.");
  }
  if (command === "owner-proof" || command === "create-wallet") {
    if (!EVM_ADDRESS.test(values.BMONI_LAB_OWNER_ADDRESS ?? "")) {
      throw new Error("LAB_OWNER_ADDRESS_REQUIRED: Use an address from a device-owned test wallet.");
    }
  }
  if (command === "create-wallet") {
    if (!PERSON_ID.test(values.BMONI_LAB_CHALLENGE_ID ?? "") ||
        !OWNER_SIGNATURE.test(values.BMONI_LAB_OWNER_PROOF_SIGNATURE ?? "")) {
      throw new Error("LAB_OWNER_PROOF_REQUIRED: Provide the provider challenge ID and device-generated EIP-191 signature.");
    }
  }
  const approved = WRITE_ACK[command];
  if (approved && (values.MONIFLOW_SHARED_KEY_LAB_ALLOW_WRITES !== "true" ||
                   values.MONIFLOW_SHARED_KEY_LAB_CONFIRM !== approved)) {
    throw new Error("LAB_WRITE_NOT_APPROVED: Set both the local writes flag and the exact single-action acknowledgment.");
  }
  return command;
}

function safeResult(stage: string, ok: boolean): Record<string, string | boolean> {
  return { stage, ok };
}

/**
 * This harness NEVER constructs a private key, signs, funds, or moves money.
 * Mutations are single-shot only: ambiguous results and 409 require manual reconciliation.
 * Provider responses are deliberately summarized to avoid leaking KYC or balances.
 */
export async function runSharedKeyLab(
  command: SharedKeyLabCommand,
  gateway: Pick<BmoniGateway,
    "getSupportedSmartWalletCurrencies" | "createUser" | "createOwnerProofChallenge" |
    "createManagedSmartWallet" | "listAccountWallets" | "listAccountBalances" |
    "getKycReadiness" | "getOnboardingStatus" | "getNigerianBanks">,
  values: Record<string, string | undefined>
): Promise<LabResult> {
  const approved = assertSharedKeyLabAllowed(command, values);
  const results: LabResult["results"] = [];
  const user = values.BMONI_LAB_USER_ID!;
  if (approved === "health") {
    const payload = await gateway.getSupportedSmartWalletCurrencies();
    results.push({ stage: "supported-currencies", ok: true, currencies: payload.currencies });
  } else if (approved === "inspect") {
    // Always read-only, with no raw identities, personal data, or balances logged.
    // One failed endpoint must not trigger a replay of a write.
    const readers = [
      ["wallets", () => gateway.listAccountWallets(user)],
      ["balances", () => gateway.listAccountBalances(user)],
      ["kyc-readiness", () => gateway.getKycReadiness(user)],
      ["onboarding-status", () => gateway.getOnboardingStatus(user)],
      ["nigerian-banks", () => gateway.getNigerianBanks(user)]
    ] as const;
    for (const [stage, reader] of readers) {
      try { await reader(); results.push(safeResult(stage, true)); }
      catch { results.push(safeResult(stage, false)); }
    }
  } else if (approved === "create-user") {
    // The documented test persona is fixed: never create a customer from a shared key.
    const created = await gateway.createUser(BUNCH);
    results.push({ stage: "sandbox-user-created", ok: true, bmoniUserId: created.bmoniUserId });
  } else if (approved === "owner-proof") {
    const challenge = await gateway.createOwnerProofChallenge(user, {
      currency: "CNGN", userOwnerAddress: values.BMONI_LAB_OWNER_ADDRESS!
    });
    // The message must be transferred to the device signer. No secret key is accepted here.
    results.push({ stage: "device-signing-required", ok: true, challengeId: challenge.challengeId, message: challenge.message });
  } else if (approved === "create-wallet") {
    const wallet = await gateway.createManagedSmartWallet(user, {
      currency: "CNGN",
      userOwnerAddress: values.BMONI_LAB_OWNER_ADDRESS!,
      ownerProofChallengeId: values.BMONI_LAB_CHALLENGE_ID!,
      ownerProofSignature: values.BMONI_LAB_OWNER_PROOF_SIGNATURE!
    });
    results.push({
      stage: "provider-wallet-response", ok: true,
      smartWalletId: wallet.smartWalletId ?? "not-returned",
      status: wallet.status ?? "not-returned"
    });
  }
  return { command: approved, sandbox: true, provider: "BMONI", results };
}
