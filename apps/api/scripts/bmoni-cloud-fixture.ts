/** Cloud runner entrypoint. No local setup, Vercel secret export or public API endpoint. */
import { getBmoniConfig } from "../src/services/bmoni/config.js";
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
  baseUrl: process.env.BMONI_BASE_URL ?? ""
};

async function main() {
  validateCloudFixtureRequest(input); // Gate before the first network request.
  const key = await loadPublicSandboxKey();
  // Never print the key, copy it to GitHub secrets/artifacts, or put it in GITHUB_ENV.
  process.env.BMONI_API_KEY = key;
  const config = getBmoniConfig();
  const gateway = new BmoniClient(config);
  const outcome = await runCloudFixtureAction(input, gateway);

  let summary = "## MONIFlow — BMONI documented sandbox fixture\n";
  summary += "- Host: embedded-dev.bmoni.com (sandbox only)\n";
  summary += "- Stage: " + outcome.action + "\n";
  summary += "- Credential: SHA-256-verified key from BMONI's public documentation (value never logged)\n";
  for (const finding of outcome.findings) {
    const label = finding.pass ? "PASS" : "BLOCKED";
    process.stdout.write(label + ": " + finding.stage + "\n");
    summary += "- " + label + ": " + finding.stage + "\n";
  }
  if (outcome.fixtureUserId) {
    // Sandbox fixture identity only; never put any real customer's ID into this harness.
    const line = "Documented test fixture BMONI ID: `" + outcome.fixtureUserId + "`";
    summary += "- " + line + "\n";
    process.stdout.write(line + "\n");
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
    code = "BMONI_FIXTURE_ALREADY_EXISTS_OR_CONFLICT: Stop, reconcile existing sandbox identity; DO NOT retry the create request.";
  } else if (cause instanceof BmoniProviderError && cause.statusCode !== 409) {
    code = "BMONI_SANDBOX_PROVIDER_HTTP_" + cause.statusCode;
  }
  process.stderr.write(code + "\n");
  await writeSummary("## MONIFlow sandbox fixture\n- Result: BLOCKED (" + code + ")\n- No provider mutation was retried.\n");
  process.exitCode = 1;
} finally {
  delete process.env.BMONI_API_KEY;
}
