import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow=readFileSync(".github/workflows/post-figma-android-apk-once.yml","utf8");
const ticket=readFileSync("docs/POST_FIGMA_ANDROID_APK_ONE_SHOT_20261022.md","utf8");
const ci=readFileSync(".github/workflows/ci.yml","utf8");
const source="d02c7887dd1c8f526e5cc6ebe8fa6bb9f32a8a04";

test("one-time build is main-only, gated by new owner ticket and exact prior SHA",()=>{
  assert.match(workflow,/branches: \[main\]/);
  assert.match(workflow,/github\.run_attempt == 1/);
  assert.match(workflow,/SOURCE_BASE_SHA: d02c7887dd1c8f526e5cc6ebe8fa6bb9f32a8a04/);
  assert.match(workflow,/test "\$BEFORE_SHA" = "\$SOURCE_BASE_SHA"/);
  assert.match(workflow,/git cat-file -e "\$BEFORE_SHA:\$TICKET"/);
  assert.match(workflow,/git diff --name-only "\$BEFORE_SHA" HEAD/);
  assert.match(ticket,/Approval: REQUEST_ONE_MONIFLOW_POST_FIGMA_ANDROID_ARM64_APK_20261022/);
  assert.ok(ticket.includes(source));
});

test("one physical APK, wait for finished compilation, inspect ARM64, no signing/deploy",()=>{
  const starts=workflow.match(/eas build --platform android --profile android-apk --non-interactive --wait --json/g)??[];
  assert.equal(starts.length,1);
  assert.match(workflow,/b\.status!=="FINISHED"/);
  assert.match(workflow,/lib\/arm64-v8a\/libreactnative\.so/);
  assert.match(workflow,/unzip -tqq/);
  assert.match(workflow,/sha256sum/);
  assert.match(workflow,/--output "\$RUNNER_TEMP\/preview\.apk"/);
  assert.match(workflow,/authenticatedSandboxDemoEnabled!==false/);
  assert.match(workflow,/partnerRegistrationEnabled!==false/);
  assert.match(workflow,/status.*deviceTested:false/);
  assert.doesNotMatch(workflow,/eas submit|--auto-submit|vercel deploy|--platform ios|npm publish/);
  assert.doesNotMatch(workflow,/\/api\/onboarding\/user|\/api\/plans\/approve|signTransactionHash/);
});

test("read-only CI validates this workflow before merging",()=>{
  const start=ci.indexOf("  native-release-evidence:\n");
  assert.ok(start>=0);
  const job=ci.slice(start);
  assert.match(job,/node --test scripts\/post-figma-android-apk\.nodecheck\.mjs/);
  assert.doesNotMatch(job,/EXPO_TOKEN|eas build|eas submit|secrets\./);
});
