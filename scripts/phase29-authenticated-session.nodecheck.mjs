import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const eas = JSON.parse(read("apps/mobile/eas.json"));
const app = read("apps/api/src/create-app.ts");
const middleware = read("apps/api/src/security/user-authorization.ts");
const session = read("apps/api/src/routes/authenticated-session.ts");
const client = read("apps/mobile/services/authenticated-readiness.ts");
const signIn = read("apps/mobile/app/auth/sign-in.tsx");
const welcome = read("apps/mobile/app/onboarding/welcome.tsx");
const config = eas.build["ios-simulator"].env;

test("EAS preview has the MONIFlow Supabase publishable client key, not privileged credentials", () => {
  assert.equal(config.EXPO_PUBLIC_API_URL, "https://moniflow-api-silk.vercel.app");
  assert.equal(config.EXPO_PUBLIC_SUPABASE_URL, "https://rtcjismwbrvulccryyau.supabase.co");
  assert.match(config.EXPO_PUBLIC_SUPABASE_ANON_KEY, /^sb_publishable_[A-Za-z0-9_-]+$/);
  assert.equal(Object.keys(config).filter(x => x.startsWith("EXPO_PUBLIC_SUPABASE")).length, 2);
  assert.doesNotMatch(JSON.stringify(config), /sb_secret_|service_role|refresh_token|private_key|BMONI_API_KEY/i);
});

test("private auth endpoint remains behind JWT middleware and never touches BMONI", () => {
  assert.match(app, /attachUserAuthorization\(app/);
  assert.match(app, /app\.register\(authenticatedSessionRoutes, \{ prefix: "\/api\/auth" \}\)/);
  assert.doesNotMatch(middleware, /["']\/api\/auth\/session["']/);
  assert.match(session, /getAuthenticatedUserId\(request\)/);
  assert.match(session, /no-store, private/);
  assert.match(session, /financialOperationsEnabled: false/);
  assert.doesNotMatch(session, /getBmoniGateway|getBmoniUserService|createManagedSmartWallet|listAccountBalances/);
});

test("iOS sign-in proves account through GET, not provider onboarding or financial operations", () => {
  assert.match(signIn, /router\.replace\("\/auth\/session"\)/);
  assert.match(welcome, /router\.push\("\/auth\/session"\)/);
  assert.match(client, /sessionForApiRequest\(\)/);
  assert.match(client, /apiFetch\(resolveApiUrl\(\) \+ "\/api\/auth\/session", \{ method: "GET" \}\)/);
  assert.match(client, /payload\.userId\?\.toLowerCase\(\) !== session\.userId\.toLowerCase\(\)/);
  assert.doesNotMatch(client, /method: "POST"|create-managed|\/api\/onboarding|\/api\/operator\/execute/);
});
