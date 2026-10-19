import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const app = JSON.parse(readFileSync("apps/mobile/app.json", "utf8")).expo;
const eas = JSON.parse(readFileSync("apps/mobile/eas.json", "utf8"));
const apk = eas.build["android-apk"];
const simulator = eas.build["ios-simulator"];
const workflow = readFileSync(".github/workflows/android-apk-preview-once.yml", "utf8");

test("APK is a standalone internal Android preview on the linked Expo project", () => {
  assert.equal(app.owner, "xpen");
  assert.equal(app.slug, "moniflow");
  assert.equal(app.extra?.eas?.projectId, "3d986249-f72b-494b-9ceb-eef8335a5ae0");
  assert.equal(app.android?.package, "com.realxpen.moniflow");
  assert.equal(apk.extends, "preview");
  assert.equal(eas.build.preview.distribution, "internal");
  assert.equal(apk.developmentClient, false);
  assert.equal(apk.android?.buildType, "apk");
  assert.equal(apk.env.EXPO_PUBLIC_API_URL, simulator.env.EXPO_PUBLIC_API_URL);
  assert.equal(apk.env.EXPO_PUBLIC_SUPABASE_URL, simulator.env.EXPO_PUBLIC_SUPABASE_URL);
  assert.equal(apk.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, simulator.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  assert.match(apk.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, /^sb_publishable_[A-Za-z0-9_-]+$/);
  for (const value of Object.values(apk.env)) {
    assert.doesNotMatch(String(value), /sb_secret_|service.role|private.key|BEGIN PRIVATE KEY/i);
  }
});

test("workflow only submits a single owner-approved APK and checks financial gates", () => {
  assert.match(workflow, /ANDROID_APK_PREVIEW_ONE_SHOT_20261019/);
  assert.match(workflow, /github\.run_attempt == 1/);
  assert.match(workflow, /REQUEST_ONE_MONIFLOW_ANDROID_APK_BUILD_20261019/);
  assert.match(workflow, /git cat-file -e "\$BEFORE_SHA:\$TICKET"/);
  assert.match(workflow, /eas build --platform android --profile android-apk --non-interactive --no-wait --json/);
  assert.doesNotMatch(workflow, /--auto-submit|eas submit|--platform ios/);
  assert.match(workflow, /partnerRegistrationEnabled!==false/);
  assert.match(workflow, /authenticatedSandboxDemoEnabled!==false/);
});
