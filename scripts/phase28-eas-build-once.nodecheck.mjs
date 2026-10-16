import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const workflow = read(".github/workflows/phase28-ios-simulator-once.yml");
const ticket = read("docs/PHASE28_IOS_SIMULATOR_ONE_SHOT_20261016.md");

test("user-approved one-time build only triggers on first release-ticket creation on main", () => {
  assert.match(workflow, /on:\s*\n  push:\s*\n    branches:\s*\n      - main/);
  assert.match(workflow, /paths:\s*\n      - docs\/PHASE28_IOS_SIMULATOR_ONE_SHOT_20261016\.md/);
  assert.match(workflow, /github\.repository == 'realxpen\/moniflow'/);
  assert.match(workflow, /github\.run_attempt == 1/);
  assert.match(workflow, /GITHUB_RUN_ATTEMPT.*!= "1"/);
  assert.match(workflow, /if git cat-file -e/);
  assert.match(workflow, /BEFORE_SHA/);
  const marker = "Approval: REQUEST_ONE_PHASE28_MONIFLOW_IOS_SIMULATOR_BUILD_20261016";
  assert.ok(ticket.includes(marker));
  assert.ok(workflow.includes(marker));
  assert.doesNotMatch(workflow, /workflow_dispatch:|\n\s+schedule:|\n\s+pull_request:/);
});

test("uses only owner-controlled EAS project and the existing GitHub secret", () => {
  assert.match(workflow, /secrets\.EXPO_TOKEN/);
  assert.match(workflow, /EXPO_OWNER: xpen/);
  assert.match(workflow, /3d986249-f72b-494b-9ceb-eef8335a5ae0/);
  assert.match(workflow, /eas project:info/);
  assert.match(workflow, /corepack enable/);
  assert.match(workflow, /pnpm install --no-frozen-lockfile/);
  assert.match(workflow, /node --test scripts\/phase28-native-experience\.nodecheck\.mjs/);
  assert.doesNotMatch(workflow, /eas init|eas project:init|--force|BMONI_API_KEY|PRIVATE_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});

test("submits one simulator build without real device signing, auto-deploy or financial writes", () => {
  const command = "eas build --platform ios --profile ios-simulator --non-interactive --no-wait";
  assert.ok(workflow.includes(command));
  assert.equal(workflow.split(command).length - 1, 1);
  assert.doesNotMatch(workflow, /--auto-submit|eas submit|eas simulator:start|vercel deploy|\/api\/wallet\/create-managed/);
  assert.match(ticket, /No real BMONI user creation/);
});
