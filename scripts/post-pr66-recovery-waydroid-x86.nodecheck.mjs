import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

const workflow=readFileSync(".github/workflows/post-pr66-recovery-waydroid-x86-apk-once.yml","utf8");
const approval=readFileSync("docs/POST_PR66_RECOVERY_WAYDROID_X86_APK_ONE_SHOT_20261022.md","utf8");
const ci=readFileSync(".github/workflows/ci.yml","utf8");
const source="1d88ada4899e882b78491e3378d95bc397e9c067";

test("fresh owner ticket, main-only first run and exact unchanged source",()=>{
  assert.match(workflow,/branches: \[main\]/);
  assert.match(workflow,/github\.run_attempt == 1/);
  assert.match(workflow,/SOURCE_BASE_SHA: 1d88ada4899e882b78491e3378d95bc397e9c067/);
  assert.match(workflow,/test "\$BEFORE_SHA" = "\$SOURCE_BASE_SHA"/);
  assert.match(workflow,/git cat-file -e "\$BEFORE_SHA:\$TICKET"/);
  assert.match(workflow,/git diff --name-only "\$BEFORE_SHA" HEAD/);
  assert.match(workflow,/REQUEST_ONE_MONIFLOW_PR66_RECOVERY_WAYDROID_X86_64_APK_20261022/);
  assert.ok(approval.includes(source));
  assert.match(approval,/one new Waydroid x86_64 UI-only APK/i);
});

test("builds at most one isolated preview and only publishes non-secret evidence",()=>{
  const commands=workflow.match(/eas build --platform android --profile waydroid-x86-apk --non-interactive --wait --json/g)??[];
  assert.equal(commands.length,1);
  assert.match(workflow,/EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW: "1"/);
  assert.match(workflow,/com\.realxpen\.moniflow\.waydroid/);
  assert.match(workflow,/nativeWalletFeaturesEnabled!==false/);
  assert.match(workflow,/@bkey-inc\/bmoni_embedded_sdk/);
  assert.match(workflow,/reactNativeArchitectures=x86_64/);
  assert.match(workflow,/lib\/x86_64\/libreactnative\.so/);
  assert.match(workflow,/unzip -tqq/);
  assert.match(workflow,/sha256sum/);
  assert.match(workflow,/b\.status!=="FINISHED"/);
  assert.match(workflow,/partnerRegistrationEnabled!==false/);
  assert.match(workflow,/authenticatedSandboxDemoEnabled!==false/);
  assert.doesNotMatch(workflow,/eas submit|--auto-submit|eas update|vercel deploy|npm publish|--platform ios/);
  assert.doesNotMatch(workflow,/\/api\/plans\/approve|signTransactionHash|\/api\/onboarding\/user/);
  assert.doesNotMatch(workflow,/path:.*waydroid-ui\.apk/);
});

test("PR CI inspects the build workflow but does not run the build",()=>{
  const job=ci.slice(ci.indexOf("  native-release-evidence:\n"));
  assert.ok(job.length>200);
  assert.match(job,/node --test scripts\/post-figma-waydroid-x86\.nodecheck\.mjs/);
  assert.doesNotMatch(job,/EXPO_TOKEN|eas build|eas submit|secrets\./);
});
