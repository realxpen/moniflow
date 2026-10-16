import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const workflow = read(".github/workflows/phase30-ios-workspace-preview-once.yml");
const ticket = read("docs/PHASE30_IOS_WORKSPACE_PREVIEW_ONE_SHOT_20261016.md");

test("one-time Phase 30 auth build requires owner ticket first-created on main", () => {
  assert.match(workflow, /push:\s*\n    branches:\s*\n      - main/);
  assert.match(workflow, /paths:\s*\n      - docs\/PHASE30_IOS_WORKSPACE_PREVIEW_ONE_SHOT_20261016\.md/);
  assert.match(workflow, /github\.run_attempt == 1/);
  assert.match(workflow, /BEFORE_SHA/);
  assert.match(workflow, /git cat-file -e/);
  const approval = "Approval: REQUEST_ONE_PHASE30_MONIFLOW_WORKSPACE_IOS_SIMULATOR_BUILD_20261016";
  assert.ok(ticket.includes(approval) && workflow.includes(approval));
  assert.doesNotMatch(workflow, /workflow_dispatch:|\n\s+schedule:|\n\s+pull_request:/);
});

test("unsigned session and workspace GETs must return 401 before EAS is called", () => {
  assert.match(workflow, /api\/auth\/session/);
  assert.match(workflow, /api\/workspace\/overview/);
  assert.match(workflow, /STATUS" != "401"/);
  assert.match(workflow, /payload\.code !== "AUTH_REQUIRED"/);
  assert.match(workflow, /partnerRegistrationEnabled !== false/);
  assert.match(workflow, /authenticatedSandboxDemoEnabled !== false/);
  assert.ok(workflow.indexOf('STATUS="$(curl') < workflow.indexOf("eas build --platform ios"));
  assert.match(workflow, /sb_publishable_/);
  assert.doesNotMatch(workflow, /BMONI_API_KEY|sb_secret_|SUPABASE_SERVICE_ROLE_KEY/);
});

test("build uses only existing Expo project, one simulator job, and never publishes funds", () => {
  assert.match(workflow, /secrets\.EXPO_TOKEN/);
  assert.match(workflow, /3d986249-f72b-494b-9ceb-eef8335a5ae0/);
  assert.match(workflow, /eas project:info/);
  assert.doesNotMatch(workflow, /eas init|eas project:init|eas submit|--auto-submit|eas simulator:start|vercel deploy/);
  const command = "eas build --platform ios --profile ios-simulator --non-interactive --no-wait";
  assert.equal(workflow.split(command).length - 1, 1);
  assert.match(ticket, /No Apple Developer paid membership/);
});
