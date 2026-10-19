import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const route = read("apps/api/src/routes/authenticated-workspace.ts");
const app = read("apps/api/src/create-app.ts");
const diagnostic = read("apps/api/src/security/workspace-storage-diagnostics.ts");

test("authenticated workspace waits for private schema readiness and fails closed", () => {
  assert.match(app, /getRepositoryReady: async \(\) => \{ await dependencies\.ready; \}/);
  assert.match(route, /await options\.getRepositoryReady\?\.\(\)/);
  assert.ok(route.indexOf("await options.getRepositoryReady?.()") <
    route.indexOf("getBmoniUserService().getMapping(userId)"));
  assert.match(route, /reply\.code\(503\)\.send\(\{ code: "WORKSPACE_READ_UNAVAILABLE", reference \}\)/);
  assert.match(route, /getAuthenticatedUserId\(request\)/);
  assert.doesNotMatch(route, /request\.query|request\.body|POST|createManagedSmartWallet|listAccountBalances/);
});

test("serverless logs only allowlisted failure category and lookup phase, never original error", () => {
  assert.match(route, /classifyWorkspaceStorageFailure\(error\)/);
  assert.match(route, /event: "workspace_storage_read_failed"/);
  assert.match(route, /const reference = randomUUID\(\)/);
  assert.match(route, /reference,/);
  assert.match(route, /stage: phase/);
  assert.doesNotMatch(route, /request\.log\.(?:error|warn)\(error|request\.log\.(?:error|warn)\(\{\s*err:|console\.error/);
  assert.match(diagnostic, /DATABASE_AUTHENTICATION/);
  assert.match(diagnostic, /DATABASE_SCHEMA/);
  assert.match(diagnostic, /UNCLASSIFIED_STORAGE_FAILURE/);
  assert.doesNotMatch(diagnostic, /error\.message|error\.stack|JSON\.stringify\(error\)/);
});
