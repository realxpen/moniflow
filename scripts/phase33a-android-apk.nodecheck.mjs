import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const ui = readFileSync("apps/mobile/components/AuthenticatedWorkspace.tsx", "utf8");
const client = readFileSync("apps/mobile/services/account-reconciliation.ts", "utf8");
const backend = readFileSync("apps/api/src/routes/identity-reconciliation.ts", "utf8");
const workflow = readFileSync(".github/workflows/phase33a-android-apk-once.yml", "utf8");
const eas = JSON.parse(readFileSync("apps/mobile/eas.json", "utf8"));
const app = JSON.parse(readFileSync("apps/mobile/app.json", "utf8")).expo;

test("Phase 33A Profile has a protected identity-review panel and conservative outcomes", () => {
  assert.match(ui, /BMONI IDENTITY RECONCILIATION/);
  assert.match(ui, /loadAccountReconciliation\(next\)/);
  assert.match(ui, /tab === "profile"/);
  assert.match(ui, /EVIDENCE NEEDED/);
  assert.match(ui, /UNVERIFIED/);
  assert.match(ui, /MANUAL REVIEW/);
  assert.match(ui, /No automatic account linking or money movement is enabled/);
});

test("Android identity-review client never attempts linking, money movement or privileged reads", () => {
  assert.match(client, /api\/workspace\/reconciliation/);
  assert.match(client, /method: "GET"/);
  assert.match(client, /automaticLinkingEnabled !== false/);
  assert.match(client, /providerOwnershipVerified !== false/);
  assert.match(client, /financialOperationsEnabled !== false/);
  assert.match(client, /sessionForApiRequest/);
  assert.doesNotMatch(client, /method: "(POST|PUT|PATCH|DELETE)"/);
  assert.match(backend, /getAuthenticatedUserId\(request\)/);
  assert.match(backend, /get\("\/reconciliation"/);
});

test("A single new approval ticket triggers one Expo build on the existing project only", () => {
  const apk = eas.build["android-apk"];
  assert.equal(app.owner, "xpen");
  assert.equal(app.slug, "moniflow");
  assert.equal(app.android.package, "com.realxpen.moniflow");
  assert.equal(app.extra.eas.projectId, "3d986249-f72b-494b-9ceb-eef8335a5ae0");
  assert.equal(apk.android.buildType, "apk");
  assert.equal(apk.developmentClient, false);
  assert.equal(eas.build.preview.distribution, "internal");
  assert.equal(apk.env.EXPO_PUBLIC_API_URL, "https://moniflow-api-silk.vercel.app");
  assert.match(apk.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, /^sb_publishable_[a-zA-Z0-9_-]+$/);
  assert.match(workflow, /PHASE33A_ANDROID_APK_PREVIEW_ONE_SHOT_20261019\.md/);
  assert.match(workflow, /REQUEST_ONE_MONIFLOW_PHASE33A_ANDROID_APK_BUILD_20261019/);
  assert.match(workflow, /github\.run_attempt == 1/);
  assert.match(workflow, /git cat-file -e "\$BEFORE_SHA:\$TICKET"/);
  assert.match(workflow, /\/api\/workspace\/reconciliation/);
  assert.match(workflow, /authenticatedSandboxDemoEnabled!==false/);
  assert.match(workflow, /partnerRegistrationEnabled!==false/);
  assert.match(workflow, /eas build --platform android --profile android-apk --non-interactive --no-wait --json/);
  assert.doesNotMatch(workflow, /eas submit|--auto-submit|--platform ios/);
});
