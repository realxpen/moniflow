import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = JSON.parse(fs.readFileSync(path.join(repo, "apps/mobile/app.json"), "utf8")).expo;
const workflow = fs.readFileSync(path.join(repo, ".github/workflows/eas-simulator-access.yml"), "utf8");

test("EAS Simulator access check targets the verified xpen Expo project", () => {
  assert.equal(app.owner, "xpen");
  assert.equal(app.slug, "moniflow");
  assert.equal(app.extra?.eas?.projectId, "3d986249-f72b-494b-9ceb-eef8335a5ae0");
});

test("EAS Simulator workflow is manual and read-only, never starts a session", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /(?:^|\n)\s+push:/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /secrets\.EXPO_TOKEN/);
  assert.match(workflow, /\[ -z "\$EXPO_TOKEN" \]/);
  // Expo loads app.json plugins (including expo-router) before querying simulator access.
  // A fresh GitHub runner must install our pnpm workspace before running eas-cli.
  assert.match(workflow, /corepack enable/);
  assert.match(workflow, /pnpm install --no-frozen-lockfile/);
  const installIndex = workflow.indexOf("pnpm install --no-frozen-lockfile");
  const accessIndex = workflow.indexOf("npx --yes eas-cli@latest simulator:availability --json");
  assert.ok(installIndex > 0 && accessIndex > installIndex, "pnpm install must precede Expo availability");
  assert.match(workflow, /simulator:availability --json/);
  assert.doesNotMatch(workflow, /simulator:start|simulator:stop|simulator:exec|\beas build\b|\beas init\b|eas project:init|BMONI_API_KEY|VERCEL_TOKEN/);
  assert.match(workflow, /data\.available === true/);
  assert.match(workflow, /data\.available === false/);
});

test("workflow shares only an eligibility boolean, not provider tokens", () => {
  assert.match(workflow, /MONIFLOW_EAS_SIMULATOR_ACCESS/);
  assert.doesNotMatch(workflow, /echo ["']?\$EXPO_TOKEN|cat ["']?\$RUNNER_TEMP/);
  assert.match(workflow, /no simulator session, chargeable runtime, build/i);
});
