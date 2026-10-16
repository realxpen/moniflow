import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const app = read("apps/api/src/create-app.ts");
const api = read("apps/api/src/routes/authenticated-workspace.ts");
const client = read("apps/mobile/services/account-workspace.ts");
const ui = read("apps/mobile/components/AuthenticatedWorkspace.tsx");
const session = read("apps/mobile/app/auth/session.tsx");

test("workspace route has no untrusted user ID input, money reads, or provider mutations", () => {
  assert.match(app, /app\.register\(authenticatedWorkspaceRoutes/);
  assert.match(api, /getAuthenticatedUserId\(request\)/);
  assert.match(api, /getMapping\(userId\)/);
  assert.match(api, /findByLocalUserId\(userId\)/);
  assert.match(api, /Cache-Control", "private, no-store"/);
  assert.match(api, /providerReadAccess: false/);
  assert.match(api, /financialOperationsEnabled: false/);
  assert.match(api, /accountData: "withheld_until_verified"/);
  assert.doesNotMatch(api, /request\.query\.|request\.body\.|getBmoniGateway|listAccountBalances|createManagedSmartWallet|\.post\(/);
});

test("all production tab screens use authenticated status instead of legacy eager financial reads", () => {
  for (const tab of ["home", "pockets", "activity", "profile"]) {
    const route = read("apps/mobile/app/(tabs)/" + tab + ".tsx");
    assert.match(route, new RegExp('export default function'));
    assert.ok(route.includes('return __DEV__ ? <Legacy'));
    assert.ok(route.includes('<AuthenticatedWorkspace tab="' + tab + '" />'));
    assert.ok(route.includes('function Legacy'));
  }
  assert.match(session, /Open your read-only workspace/);
  assert.match(session, /router\.replace\("\/\(tabs\)\/home"\)/);
});

test("production view and client use no financial endpoints or fabricated balances", () => {
  assert.match(client, /sessionForApiRequest\(\)/);
  assert.match(client, /apiFetch\(resolveApiUrl\(\) \+ "\/api\/workspace\/overview", \{ method: "GET" \}\)/);
  assert.match(client, /data\.userId\.toLowerCase\(\) !== active\.userId\.toLowerCase\(\)/);
  assert.match(ui, /accountData|wallet ownership|wallet|provider/i);
  assert.match(ui, /WITHHELD/);
  assert.doesNotMatch(ui, /loadWalletBalance|loadPockets|loadActivity|getSavedDestination|\.post\(|createManagedSmartWallet|₦300,000\s*opening/i);
});
