import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const w=readFileSync(".github/workflows/pinned-pr68-waydroid-x86-apk-once.yml","utf8");
const ticket=readFileSync("docs/PINNED_PR68_WAYDROID_ONE_SHOT_20261022.md","utf8");
const ci=readFileSync(".github/workflows/ci.yml","utf8");
const sha="1d88ada4899e882b78491e3378d95bc397e9c067";

test("pins the previous owner-reviewed source regardless of unrelated main merges",()=>{
 assert.match(w,/BUILD_SOURCE_SHA: 1d88ada4899e882b78491e3378d95bc397e9c067/);
 assert.match(w,/fetch-depth: 0/);
 assert.match(w,/git merge-base --is-ancestor "\$BUILD_SOURCE_SHA" "\$BEFORE_SHA"/);
 assert.match(w,/git checkout --force --detach "\$BUILD_SOURCE_SHA"/);
 assert.match(w,/test "\$\(git rev-parse HEAD\)" = "\$BUILD_SOURCE_SHA"/);
 assert.match(w,/test "\$\(git rev-parse HEAD\^\)" = "\$BEFORE_SHA"/);
 assert.doesNotMatch(w,/test "\$BEFORE_SHA" = "\$BUILD_SOURCE_SHA"/);
 assert.match(ticket,/REQUEST_ONE_MONIFLOW_PINNED_PR68_WAYDROID_X86_64_APK_20261022/);
 assert.ok(ticket.includes(sha));
});

test("uses a new one-time, allowlisted main-only ticket before pinned checkout",()=>{
 assert.match(w,/branches: \[main\]/);
 assert.match(w,/github\.run_attempt == 1/);
 assert.match(w,/git cat-file -e "\$BEFORE_SHA:\$TICKET"/);
 assert.match(w,/git diff --name-only "\$BEFORE_SHA" HEAD/);
 assert.match(w,/docs\/PINNED_PR68_WAYDROID_ONE_SHOT_20261022\.md/);
 assert.match(w,/scripts\/pinned-pr68-waydroid-x86\.nodecheck\.mjs/);
 assert.ok(w.indexOf("Verify first-created ticket")<w.indexOf("Select exact owner-reviewed mobile source"));
 assert.ok(w.indexOf("Select exact owner-reviewed mobile source")<w.indexOf("pnpm install"));
});

test("one safe x86 UI-only build with SHA provenance, never a native finance execution",()=>{
 assert.equal((w.match(/eas build --platform android --profile waydroid-x86-apk --non-interactive --wait --json/g)||[]).length,1);
 assert.match(w,/EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW: "1"/);
 assert.match(w,/com\.realxpen\.moniflow\.waydroid/);
 assert.match(w,/nativeWalletFeaturesEnabled!==false/);
 assert.match(w,/@bkey-inc\/bmoni_embedded_sdk/);
 assert.match(w,/reactNativeArchitectures=x86_64/);
 assert.match(w,/lib\/x86_64\/libreactnative\.so/);
 assert.match(w,/unzip -tqq/);
 assert.match(w,/sha256sum/);
 assert.match(w,/b\.status!=="FINISHED"/);
 assert.match(w,/sourceSha:process\.env\.BUILD_SOURCE_SHA,triggerSha:process\.env\.GITHUB_SHA/);
 assert.match(w,/partnerRegistrationEnabled!==false/);
 assert.match(w,/authenticatedSandboxDemoEnabled!==false/);
 assert.doesNotMatch(w,/eas submit|--auto-submit|eas update|vercel deploy|npm publish|--platform ios|signTransactionHash/);
});

test("PR CI inspects this workflow without using Expo credentials or submitting builds",()=>{
 const job=ci.slice(ci.indexOf("  native-release-evidence:\n"));
 assert.match(job,/node --test scripts\/pinned-pr68-waydroid-x86\.nodecheck\.mjs/);
 assert.doesNotMatch(job,/EXPO_TOKEN|eas build|eas submit|secrets\./);
});
