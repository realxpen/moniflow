/** Cloud runner entrypoint. No local setup, Vercel secret export or public API endpoint. */
import { BmoniClient } from "../src/services/bmoni/client.js";
import { BmoniProviderError } from "../src/services/bmoni/errors.js";
import { validateCloudFixtureRequest, runCloudFixtureAction } from "../src/services/bmoni/cloud-fixture-gate.js";
import { loadPublicSandboxKey } from "../src/services/bmoni/cloud-shared-key.js";

const input = {
  action: process.env.MONIFLOW_FIXTURE_ACTION ?? "",
  acknowledgment: process.env.MONIFLOW_FIXTURE_ACKNOWLEDGMENT ?? "",
  userId: process.env.MONIFLOW_FIXTURE_USER_ID ?? "",
  githubActions: process.env.GITHUB_ACTIONS ?? "",
  githubEvent: process.env.GITHUB_EVENT_NAME ?? "",
  githubRef: process.env.GITHUB_REF ?? "",
  financialProvider: process.env.FINANCIAL_PROVIDER ?? "",
  baseUrl: process.env.BMONI_BASE_URL ?? "",
  githubRunId: process.env.GITHUB_RUN_ID ?? "",
  githubRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? ""
};

async function main() {
  validateCloudFixtureRequest(input); // Gate before the first network request.
  const key = await loadPublicSandboxKey();
  // Never print the key, copy it to GitHub secrets/artifacts, or put it in GITHUB_ENV.
  process.env.BMONI_API_KEY = key;
  // Load config only AFTER injecting the ephemeral public key. Env parser freezes at import time.
  const { getBmoniConfig } = await import("../src/services/bmoni/config.js");
  const config = getBmoniConfig();
  const gateway = new BmoniClient(config);
  const outcome = await runCloudFixtureAction(input, gateway);

  let summary = "## MONIFlow — real BMONI sandbox registration or inspection\n";
  summary += "- Host: embedded-dev.bmoni.com (sandbox only)\n";
  summary += "- Stage: " + outcome.action + "\n";
  summary += "- Credential: SHA-256-verified key from BMONI's public documentation (value never logged)\n";
  for (const finding of outcome.findings) {
    const label = finding.pass ? "PASS" : "BLOCKED";
    process.stdout.write(label + ": " + finding.stage + "\n");
    summary += "- " + label + ": " + finding.stage + "\n";
  }
  if (outcome.fixtureUserId) {
    // This workflow is for synthetic test identities only, on a PUBLIC repository.
    summary += "- BMONI SANDBOX bmoniUserId: `" + outcome.fixtureUserId + "`\n";
    summary += "- This test-only ID is visible in the GitHub summary. Never fund, use real PII or attach a live account.\n";
    process.stdout.write("PASS: real BMONI sandbox user ID returned (see GitHub summary)\n");
  }
  if (outcome.syntheticIdentity) {
    summary += "- Synthetic sandbox email: `" + outcome.syntheticIdentity.email + "`\n";
    summary += "- Synthetic sandbox phone: `" + outcome.syntheticIdentity.phoneNumber + "`\n";
    summary += "- KYC status: NOT VERIFIED; unique synthetic identities are not BMONI's approved KYC personas.\n";
  }
  summary += "- Device-owned wallet proof: NOT PERFORMED\n";
  summary += "- Transactions, signing, KYC submission, real funds and public onboarding: NOT PERFORMED\n";
  await writeSummary(summary);
  if (outcome.findings.some(item => !item.pass)) process.exitCode = 1;
}

async function writeSummary(message: string) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_STEP_SUMMARY, message, { encoding: "utf8" });
}

try {
  await main();
} catch (cause) {
  // Provider messages may contain emails, phone numbers, keys, BVN or user IDs.
  // No upstream errors are ever printed raw.
  let code = cause instanceof Error && cause.message.startsWith("CLOUD_FIXTURE_")
    ? cause.message : "BMONI_SANDBOX_STAGE_FAILED";
  if (cause instanceof BmoniProviderError && cause.statusCode === 409) {
    code = "BMONI_SANDBOX_IDENTITY_CONFLICT: Stop and reconcile with BMONI; DO NOT rerun this creation.";
  } else if (cause instanceof BmoniProviderError && cause.statusCode !== 409) {
    code = "BMONI_SANDBOX_PROVIDER_HTTP_" + cause.statusCode;
  }
  process.stderr.write(code + "\n");
  await writeSummary("## MONIFlow sandbox fixture\n- Result: BLOCKED (" + code + ")\n- No provider mutation was retried.\n");
  process.exitCode = 1;
} finally {
  delete process.env.BMONI_API_KEY;
}
