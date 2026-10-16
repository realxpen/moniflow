import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobile = path.join(repo, "apps", "mobile");
const app = JSON.parse(fs.readFileSync(path.join(mobile, "app.json"), "utf8")).expo;
const eas = JSON.parse(fs.readFileSync(path.join(mobile, "eas.json"), "utf8"));
const workflow = fs.readFileSync(path.join(repo, ".github", "workflows", "eas-ios-simulator.yml"), "utf8");

test("MONIFlow iOS Simulator is a separate unsigned standalone build profile", () => {
  const profile = eas.build["ios-simulator"];
  assert.equal(profile.extends, "preview");
  assert.equal(eas.build.preview.distribution, "internal");
  assert.equal(eas.build.preview.developmentClient, undefined);
  assert.equal(profile.ios.simulator, true);
  assert.equal(profile.developmentClient, undefined);
  assert.equal(profile.env.EXPO_PUBLIC_API_URL, "https://moniflow-api-silk.vercel.app");
  assert.equal(profile.env.EAS_NO_FROZEN_LOCKFILE, "1");
  assert.equal(app.ios.bundleIdentifier, "com.realxpen.moniflow");
  assert.equal(app.owner, "xpen");
  assert.equal(app.slug, "moniflow");
  assert.equal(app.extra?.eas?.projectId, "3d986249-f72b-494b-9ceb-eef8335a5ae0");
});

test("cloud workflow is manual, branch-bound, simulator-only, and blocks missing credentials", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /(?:^|\n)\s+push:/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /LINK_AND_BUILD_MONIFLOW_IOS_SIMULATOR/);
  assert.match(workflow, /secrets\.EXPO_TOKEN/);
  assert.match(workflow, /\[\[ -z "\$EXPO_TOKEN" \]\]/);
  assert.match(workflow, /EXPO_OWNER" != "xpen"/);
  assert.match(workflow, /projectId !== "3d986249-f72b-494b-9ceb-eef8335a5ae0"/);
  assert.match(workflow, /eas project:info/);
  assert.doesNotMatch(workflow, /eas init|eas project:init|--force/);
  assert.match(workflow, /eas build --platform ios --profile ios-simulator --non-interactive --no-wait/);
  assert.doesNotMatch(workflow, /--auto-submit|\beas submit\b|\bvercel deploy\b|BMONI_API_KEY/);
});

test("no privileged or secret Expo environment variables enter bundled JavaScript", () => {
  const environment = eas.build["ios-simulator"].env;
  assert.deepEqual(Object.keys(environment).sort(), [
    "EAS_NO_FROZEN_LOCKFILE", "EXPO_PUBLIC_API_URL",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY", "EXPO_PUBLIC_SUPABASE_URL"
  ]);
  assert.equal(environment.EXPO_PUBLIC_SUPABASE_URL, "https://rtcjismwbrvulccryyau.supabase.co");
  // Modern sb_publishable_ keys are intentionally public in client bundles.
  // NEVER embed Supabase service_role, sb_secret_, or actual auth JWTs.
  assert.match(environment.EXPO_PUBLIC_SUPABASE_ANON_KEY, /^sb_publishable_[A-Za-z0-9_-]+$/);
  assert.doesNotMatch(JSON.stringify(environment), /sb_secret_|service_role|refresh_token|BMONI_API_KEY/i);
  assert.equal(app.ios.infoPlist?.ITSAppUsesNonExemptEncryption, undefined);
});
