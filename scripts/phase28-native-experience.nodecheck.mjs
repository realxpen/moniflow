import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

test("native Operator resets an existing ScrollView instead of remounting or freezing its offset", () => {
  const operator = read("apps/mobile/app/demo/operator.tsx");
  const screen = read("apps/mobile/components/ui/Screen.tsx");
  assert.match(screen, /scrollRef\?: Ref<ScrollView>/);
  assert.match(screen, /ref=\{scrollRef\}/);
  assert.match(operator, /scrollRef=\{scrollRef\}/);
  assert.match(operator, /useEffect\(\(\) => \{/);
  assert.match(operator, /\}, \[stage\]\)/);
  assert.match(operator, /scrollTo\(\{ y: 0, animated: false \}\)/);
  assert.match(operator, /requestAnimationFrame/);
  assert.match(operator, /cancelAnimationFrame/);
  assert.match(operator, /STEP \$\{order\.indexOf\(stage\) \+ 1\} OF/);
  assert.match(operator, /accessibilityRole="progressbar"/);
  assert.match(operator, /SIMULATION · NO ACTUAL FUNDS/);
  assert.doesNotMatch(operator, /scroll=\{false\}|\bBMONI_API_KEY\b|\/api\/wallet\/create-managed/);
});

test("welcome never enables sign-in without public auth configuration", () => {
  const welcome = read("apps/mobile/app/onboarding/welcome.tsx");
  assert.match(welcome, /authIsConfigured\(\)/);
  assert.match(welcome, /evaluateNativeLaunchReadiness/);
  assert.match(welcome, /disabled=\{!launchReadiness\.canOfferSignIn\}/);
  assert.match(welcome, /SIGN-IN SETUP REQUIRED/);
  assert.match(welcome, /offline Operator remains safe to explore/);
  assert.match(welcome, /partnerPending/);
});

test("native wallet owner proof cannot be initiated for a foreign/unbound production account", () => {
  const wallet = read("apps/mobile/app/onboarding/wallet-native.tsx");
  assert.match(wallet, /workspaceIdentity\(\{/);
  assert.match(wallet, /authUserId: signedIn\?\.userId \?\? null/);
  assert.match(wallet, /if \(!__DEV__ && !signedIn\)/);
  assert.match(wallet, /disabled=\{busy \|\| !localUserId\}/);
  assert.match(wallet, /ACCOUNT MAPPING REQUIRED/);
  assert.match(wallet, /bmoniDevice\.signMessage/);
  assert.doesNotMatch(wallet, /process\.env\.BMONI_API_KEY|process\.env\.PRIVATE_KEY/);
});
