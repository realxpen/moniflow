import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");

export const UNVERIFIED_NATIVE_GATES = Object.freeze([
  "Current-commit EAS native APK compilation and finished artifact",
  "Installed APK provenance, Android ABI and successful cold start",
  "VoiceOver/TalkBack focus order and 100%/150%/200% font sizes",
  "Device-only signing and PIN handling on supported native hardware",
  "Owner switching, background/resume, offline/reconnect and reconciliation",
  "Permitted BMONI sandbox provider receipts and ledger evidence",
  "Explicit separate owner release approval"
]);

/** Static source inspection ONLY; no provider requests, Expo calls, or signing. */
export function inspectNativeReleaseSource(sourceCommit = "unknown") {
  const app = JSON.parse(read("apps/mobile/app.json")).expo;
  const eas = JSON.parse(read("apps/mobile/eas.json"));
  const physical = eas.build["android-apk"];
  const waydroid = eas.build["waydroid-x86-apk"];
  const config = require(path.join(root, "apps/mobile/app.config.js"));

  assert.equal(app.owner, "xpen");
  assert.equal(app.slug, "moniflow");
  assert.equal(app.android?.package, "com.realxpen.moniflow");
  assert.equal(app.extra?.eas?.projectId, "3d986249-f72b-494b-9ceb-eef8335a5ae0");
  assert.ok(app.plugins.includes("./plugins/with-bmoni-sdk.js"));
  assert.equal(eas.build.preview.distribution, "internal");
  assert.equal(physical.extends, "preview");
  assert.equal(physical.developmentClient, false);
  assert.equal(physical.android?.buildType, "apk");
  assert.notEqual(physical.env?.EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW, "1");
  assert.equal(new URL(physical.env.EXPO_PUBLIC_API_URL).protocol, "https:");
  assert.match(physical.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, /^sb_publishable_[A-Za-z0-9_-]+$/);
  for (const [key, value] of Object.entries(physical.env)) {
    assert.doesNotMatch(String(value), /sb_secret_|service.role|BEGIN PRIVATE KEY|password/i, key);
  }

  assert.equal(waydroid.extends, "android-apk");
  assert.equal(waydroid.env?.EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW, "1");
  assert.equal(waydroid.env?.EXPO_TOKEN, undefined);
  const before = process.env.EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW;
  let regular;
  let preview;
  try {
    delete process.env.EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW;
    regular = config({ config: app });
    process.env.EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW = "1";
    preview = config({ config: app });
  } finally {
    if (before === undefined) delete process.env.EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW;
    else process.env.EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW = before;
  }
  assert.deepEqual(regular, app);
  assert.equal(preview.android.package, "com.realxpen.moniflow.waydroid");
  assert.equal(preview.extra.nativeWalletFeaturesEnabled, false);
  assert.ok(preview.plugins.includes("./plugins/with-waydroid-x86.js"));
  assert.ok(!preview.plugins.includes("./plugins/with-bmoni-sdk.js"));
  assert.ok(preview.autolinking.android.exclude.includes("@bkey-inc/bmoni_embedded_sdk"));

  const native = read("apps/mobile/services/bmoni-device.native.ts");
  const api = read("apps/mobile/services/api-fetch.ts");
  assert.match(native, /available: !waydroidUiPreview/);
  assert.match(native, /if \(waydroidUiPreview\)/);
  assert.match(native, /BMONI wallet and signing are unavailable/);
  assert.match(api, /isOurApi &&/);
  assert.match(api, /!\["GET", "HEAD"\]\.includes/);

  const buildWorkflow = read(".github/workflows/android-apk-preview-once.yml");
  assert.match(buildWorkflow, /REQUEST_ONE_MONIFLOW_ANDROID_APK_BUILD_20261019/);
  assert.match(buildWorkflow, /github\.run_attempt == 1/);
  assert.doesNotMatch(buildWorkflow, /eas submit|--auto-submit/);

  return {
    schema: "moniflow-native-source-preflight-v1",
    sourceCommit,
    mode: "READ_ONLY_STATIC_SOURCE_INSPECTION",
    staticSourceStatus: "PASS",
    releaseDecision: "HOLD_NATIVE_AND_PROVIDER_EVIDENCE",
    checks: [
      "Expo project and regular Android app identity preserved",
      "Phone profile remains internal APK with BMONI native plugin",
      "Waydroid profile is x86_64 UI-only and excludes native BMONI signer",
      "Waydroid request mutation fence remains present",
      "Existing APK workflows still require explicit one-time approval"
    ],
    nativeArtifactVerified: false,
    installedAppVerified: false,
    providerCompletionVerified: false,
    missingEvidence: [...UNVERIFIED_NATIVE_GATES]
  };
}

export function summaryMarkdown(result) {
  return [
    "## MONIFlow native release evidence (read-only)",
    "",
    "- Source commit: " + result.sourceCommit,
    "- Static configuration: **" + result.staticSourceStatus + "**",
    "- Release decision: **" + result.releaseDecision + "**",
    "- Native APK submitted by this job: **NO**",
    "- App deployed by this job: **NO**",
    "- Provider/API queried by this job: **NO**",
    "",
    "### Static checks",
    ...result.checks.map((check) => "- PASS: " + check),
    "",
    "### Still requires separate evidence",
    ...result.missingEvidence.map((gate) => "- NOT VERIFIED: " + gate),
    "",
    "**Green static checks do not prove a finished APK, functioning device, verified BMONI wallet or successful transfer.**",
    ""
  ].join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf("--output");
  const output = index >= 0 ? process.argv[index + 1] : undefined;
  if (index >= 0 && !output) throw new Error("--output requires a JSON file path");
  const result = inspectNativeReleaseSource(process.env.GITHUB_SHA ?? "unknown");
  const markdown = summaryMarkdown(result);
  if (output) {
    mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { mode: 0o600 });
  }
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + "\n");
  process.stdout.write(markdown);
}
