import type { BmoniGateway } from "./gateway.js";

/** Only a published BMONI sandbox fixture is accepted. Never open to real customer PII. */
export type CloudFixtureAction = "connectivity" | "create-fixture" | "create-custom-user" | "inspect-user";

export type CloudFixtureSettings = {
  action: string;
  acknowledgment: string;
  userId: string;
  githubEvent: string;
  githubRef: string;
  githubActions: string;
  financialProvider: string;
  baseUrl: string;
  githubRunId: string;
  githubRunAttempt: string;
};

const SANDBOX_URL = "https://embedded-dev.bmoni.com";
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
export const CREATE_FIXTURE_ACK = "CREATE_ONE_BMONI_SANDBOX_TEST_USER";
export const CREATE_CUSTOM_USER_ACK = "CREATE_ONE_MONIFLOW_BMONI_SANDBOX_USER";

export function validateCloudFixtureRequest(input: CloudFixtureSettings): CloudFixtureAction {
  // A main-branch push may only run the credential-free connectivity read.
  // All provider writes still require a separate manual workflow_dispatch.
  const automaticRead = input.githubEvent === "push" && input.action === "connectivity";
  if (input.githubActions !== "true" ||
      (!automaticRead && input.githubEvent !== "workflow_dispatch") ||
      input.githubRef !== "refs/heads/main") {
    throw new Error("CLOUD_FIXTURE_ACTION_NOT_AUTHORIZED");
  }
  if (input.baseUrl !== SANDBOX_URL || input.financialProvider !== "bmoni") {
    throw new Error("CLOUD_FIXTURE_SANDBOX_CONFIGURATION_REQUIRED");
  }
  if (input.action === "connectivity") {
    if (input.userId || input.acknowledgment) throw new Error("CLOUD_FIXTURE_UNEXPECTED_INPUT");
    return "connectivity";
  }
  if (input.action === "create-fixture") {
    if (input.userId || input.acknowledgment !== CREATE_FIXTURE_ACK) {
      throw new Error("CLOUD_FIXTURE_EXPLICIT_APPROVAL_REQUIRED");
    }
    return "create-fixture";
  }
  if (input.action === "create-custom-user") {
    // The only custom POST is explicitly approved, manually dispatched, on main.
    // Re-running the same GitHub job is forbidden, including after timeouts.
    // Every fresh dispatch has an auditably unique, synthetic test identity.
    if (input.userId || input.acknowledgment !== CREATE_CUSTOM_USER_ACK ||
        !/^[1-9][0-9]{8,17}$/.test(input.githubRunId) ||
        input.githubRunAttempt !== "1" ||
        input.githubEvent !== "workflow_dispatch") {
      throw new Error("CLOUD_FIXTURE_CUSTOM_USER_APPROVAL_REQUIRED");
    }
    return "create-custom-user";
  }
  if (input.action === "inspect-user") {
    if (!ID_PATTERN.test(input.userId) || input.acknowledgment) {
      throw new Error("CLOUD_FIXTURE_VERIFIED_USER_ID_REQUIRED");
    }
    return "inspect-user";
  }
  throw new Error("CLOUD_FIXTURE_UNSUPPORTED_ACTION");
}

const FIXTURE = Object.freeze({
  firstName: "Bunch",
  lastName: "Dillon",
  email: "bunch.dillon@example.com",
  phoneNumber: "+2348000000000"
});

/** This is an unverified sandbox registration identity, not an approved KYC persona.
 * Synthetic details use IANA's reserved example.com domain, never the user's
 * real email/phone/BVN. GitHub run IDs make each attempt auditable.
 * Phone numbers may not be accepted by BMONI; never improvise KYC on failure.
 */
export function syntheticRegistrationForRun(githubRunId: string) {
  if (!/^[1-9][0-9]{8,17}$/.test(githubRunId)) {
    throw new Error("CLOUD_FIXTURE_RUN_ID_INVALID");
  }
  const lastSeven = githubRunId.slice(-7).padStart(7, "0");
  if (lastSeven === "0000000" || lastSeven === "0000001") {
    throw new Error("CLOUD_FIXTURE_RESERVED_SANDBOX_PHONE");
  }
  return Object.freeze({
    firstName: "Moniflow",
    lastName: "Sandbox",
    email: `moniflow.sandbox.${githubRunId}@example.com`,
    phoneNumber: `+234800${lastSeven}`,
    employeeId: `MF-CLOUD-${githubRunId}`,
    identityId: `moniflow-cloud-${githubRunId}`
  });
}

export type CloudFixtureFinding = {
  stage: string;
  pass: boolean;
  reason?: "provider_rejected" | "provider_unavailable";
};
export type CloudFixtureOutcome = {
  action: CloudFixtureAction;
  sandbox: true;
  findings: CloudFixtureFinding[];
  // The BMONI test ID is the documented sandbox's non-personal fixture identifier.
  // It is only returned to the manually-triggered job summary after a successful create.
  fixtureUserId?: string;
  /** Synthetic identifiers only; never use this profile for Nigerian KYC. */
  syntheticIdentity?: { email: string; phoneNumber: string };
  readyForDeviceProof: boolean;
};

/**
 * One operation at a time. Mutations are never retried. Account and wallet
 * observations use only documented gateway read endpoints, with redacted summaries.
 */
export async function runCloudFixtureAction(
  input: CloudFixtureSettings,
  gateway: Pick<BmoniGateway,
    "getSupportedSmartWalletCurrencies" | "createUser" | "listAccountWallets" |
    "listAccountBalances" | "getKycReadiness" | "getOnboardingStatus">,
): Promise<CloudFixtureOutcome> {
  const action = validateCloudFixtureRequest(input);
  const findings: CloudFixtureFinding[] = [];
  if (action === "connectivity") {
    const result = await gateway.getSupportedSmartWalletCurrencies();
    const supported = result.currencies.includes("CNGN");
    findings.push({ stage: "bmoni-cngn-supported", pass: supported });
    return { action, sandbox: true, findings, readyForDeviceProof: false };
  }
  if (action === "create-fixture") {
    // A 409 or timeout is an unknown/existing identity: never blindly retry.
    const result = await gateway.createUser(FIXTURE);
    if (!ID_PATTERN.test(result.bmoniUserId)) {
      throw new Error("CLOUD_FIXTURE_INVALID_PROVIDER_ID");
    }
    findings.push({ stage: "documented-fixture-created", pass: true });
    return {
      action, sandbox: true, findings, fixtureUserId: result.bmoniUserId,
      readyForDeviceProof: false
    };
  }

  if (action === "create-custom-user") {
    const persona = syntheticRegistrationForRun(input.githubRunId);
    // Exactly one documented POST /v1/users. No retries, fallback,
    // user-ID guessing, wallet creation or production account binding.
    const result = await gateway.createUser(persona);
    if (!ID_PATTERN.test(result.bmoniUserId) ||
        result.email.toLowerCase() !== persona.email.toLowerCase()) {
      throw new Error("CLOUD_FIXTURE_INVALID_CUSTOM_USER_RESPONSE");
    }
    findings.push({ stage: "real-bmoni-sandbox-registration", pass: true });
    return {
      action, sandbox: true, findings, fixtureUserId: result.bmoniUserId,
      syntheticIdentity: { email: persona.email, phoneNumber: persona.phoneNumber },
      readyForDeviceProof: false
    };
  }

  const reads = [
    ["wallet-list", () => gateway.listAccountWallets(input.userId)],
    ["balance-read", () => gateway.listAccountBalances(input.userId)],
    ["kyc-readiness", () => gateway.getKycReadiness(input.userId)],
    ["onboarding-status", () => gateway.getOnboardingStatus(input.userId)]
  ] as const;
  for (const [stage, read] of reads) {
    try {
      // No PII, balance values, full provider objects or user IDs in results.
      await read();
      findings.push({ stage, pass: true });
    } catch {
      findings.push({ stage, pass: false, reason: "provider_unavailable" });
    }
  }
  return {
    action, sandbox: true, findings,
    readyForDeviceProof: false // Never claim ownership without an on-device signature.
  };
}
