import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { inspectNativeReleaseSource, summaryMarkdown, UNVERIFIED_NATIVE_GATES } from "./native-release-evidence.mjs";

test("source preflight verifies profiles without performing native or provider actions", () => {
  const report = inspectNativeReleaseSource("test-commit");
  assert.equal(report.sourceCommit, "test-commit");
  assert.equal(report.mode, "READ_ONLY_STATIC_SOURCE_INSPECTION");
  assert.equal(report.staticSourceStatus, "PASS");
  assert.equal(report.releaseDecision, "HOLD_NATIVE_AND_PROVIDER_EVIDENCE");
  assert.equal(report.nativeArtifactVerified, false);
  assert.equal(report.installedAppVerified, false);
  assert.equal(report.providerCompletionVerified, false);
  assert.equal(report.checks.length, 5);
  assert.deepEqual(report.missingEvidence, [...UNVERIFIED_NATIVE_GATES]);
});

test("evidence does not represent CI as native testing or release permission", () => {
  const markdown = summaryMarkdown(inspectNativeReleaseSource("abc123"));
  assert.match(markdown, /abc123/);
  assert.match(markdown, /HOLD_NATIVE_AND_PROVIDER_EVIDENCE/);
  assert.match(markdown, /Native APK submitted by this job: \*\*NO\*\*/);
  assert.match(markdown, /Provider\/API queried by this job: \*\*NO\*\*/);
  assert.match(markdown, /NOT VERIFIED: VoiceOver\/TalkBack/);
  assert.doesNotMatch(markdown, /READY FOR PRODUCTION|FINANCIAL EXECUTION APPROVED/);
});

test("CI evidence job requires neither secrets nor EAS builds", () => {
  const ci = readFileSync(".github/workflows/ci.yml", "utf8");
  const start = ci.indexOf("  native-release-evidence:\n");
  assert.ok(start >= 0);
  const job = ci.slice(start);
  assert.match(job, /node --test scripts\/native-release-evidence\.nodecheck\.mjs/);
  assert.match(job, /node scripts\/native-release-evidence\.mjs --output/);
  assert.match(job, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(job, /EXPO_TOKEN|eas build|eas submit|vercel deploy|workflow_dispatch|pull_request_target|secrets\./);
});
