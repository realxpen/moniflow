import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const base = JSON.parse(readFileSync("apps/mobile/app.json", "utf8")).expo;
const eas = JSON.parse(readFileSync("apps/mobile/eas.json", "utf8"));
const config = require("../apps/mobile/app.config.js");
const nativeConfigPath = require.resolve("../apps/mobile/react-native.config.js");
const text = (path) => readFileSync(path, "utf8");
const environment = "EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW";

function withPreview(enabled, action) {
  const previous = process.env[environment];
  try {
    if (enabled) process.env[environment] = "1";
    else delete process.env[environment];
    return action();
  } finally {
    if (previous === undefined) delete process.env[environment];
    else process.env[environment] = previous;
  }
}

test("default Expo config remains the unchanged physical-device application", () => {
  withPreview(false, () => {
    assert.deepEqual(config({ config: base }), base);
    assert.equal(base.android.package, "com.realxpen.moniflow");
    assert.ok(base.plugins.includes("./plugins/with-bmoni-sdk.js"));
  });
});

test("Waydroid opt-in uses a distinct package and leaves BMONI plugin out", () => {
  withPreview(true, () => {
    const preview = config({ config: base });
    assert.equal(preview.android.package, "com.realxpen.moniflow.waydroid");
    assert.equal(preview.name, "MONIFlow Waydroid");
    assert.equal(preview.slug, base.slug);
    assert.equal(preview.owner, base.owner);
    assert.deepEqual(preview.extra.eas, base.extra.eas);
    assert.equal(preview.extra.nativeWalletFeaturesEnabled, false);
    assert.ok(preview.plugins.includes("./plugins/with-waydroid-x86.js"));
    assert.ok(!preview.plugins.includes("./plugins/with-bmoni-sdk.js"));
    assert.ok(preview.autolinking.android.exclude.includes("@bkey-inc/bmoni_embedded_sdk"));
  });
});

test("BMONI is excluded from Android autolinking only in the preview", () => {
  withPreview(true, () => {
    delete require.cache[nativeConfigPath];
    const native = require(nativeConfigPath);
    assert.equal(native.dependencies["@bkey-inc/bmoni_embedded_sdk"].platforms.android, null);
  });
  withPreview(false, () => {
    delete require.cache[nativeConfigPath];
    const native = require(nativeConfigPath);
    assert.deepEqual(native.dependencies, {});
  });
});

test("EAS keeps existing phone profile and adds opt-in preview with inherited credentials", () => {
  assert.equal(eas.build["android-apk"].android.buildType, "apk");
  assert.equal(eas.build["android-apk"].developmentClient, false);
  assert.equal(eas.build["android-apk"].env[environment], undefined);
  assert.equal(eas.build["waydroid-x86-apk"].extends, "android-apk");
  assert.equal(eas.build["waydroid-x86-apk"].env[environment], "1");
  assert.equal(eas.build["waydroid-x86-apk"].env.EXPO_TOKEN, undefined);
});

test("Preview targets x86_64 and cannot initialize device keys or sign", () => {
  const plugin = text("apps/mobile/plugins/with-waydroid-x86.js");
  const device = text("apps/mobile/services/bmoni-device.native.ts");
  assert.match(plugin, /reactNativeArchitectures/);
  assert.match(plugin, /x86_64/);
  assert.match(device, /available: !waydroidUiPreview/);
  assert.match(device, /if \(waydroidUiPreview\)/);
  assert.match(device, /if \(!waydroidUiPreview\) nativeSdk\(\)\.initialize/);
  assert.match(device, /throw new Error\("BMONI wallet and signing are unavailable/);
  assert.doesNotMatch(device, /^import \{ BmoniEmbeddedSdk \} from /m);
});

test("Original Waydroid remains read-only; separate sandbox APK cannot sign", () => {
  const api = text("apps/mobile/services/api-fetch.ts");
  const policy = text("apps/mobile/services/waydroid-sandbox-write-policy.ts");
  const welcome = text("apps/mobile/app/onboarding/welcome.tsx");
  assert.match(api, /!\["GET", "HEAD"\]\.includes/);
  assert.match(api, /isAllowedWaydroidSandboxMutation/);
  assert.match(api, /EXPO_PUBLIC_MONIFLOW_SANDBOX_PREVIEW === "1"/);
  assert.match(api, /Waydroid financial operations are disabled/);
  assert.match(policy, /sandboxMutationPaths/);
  assert.match(policy, /moniflow-sandbox-staging-git-rc-moni/);
  assert.match(welcome, /WAYDROID · READ-ONLY PREVIEW/);
  assert.equal(eas.build["waydroid-x86-apk"].env.EXPO_PUBLIC_MONIFLOW_SANDBOX_PREVIEW, undefined);
  const special = eas.build["waydroid-sandbox-x86-apk"];
  assert.equal(special.extends, "waydroid-x86-apk");
  assert.equal(special.env.EXPO_PUBLIC_MONIFLOW_SANDBOX_PREVIEW, "1");
  const previous = process.env.EXPO_PUBLIC_MONIFLOW_SANDBOX_PREVIEW;
  try {
    withPreview(true, () => {
      process.env.EXPO_PUBLIC_MONIFLOW_SANDBOX_PREVIEW = "1";
      const preview = config({ config: base });
      assert.equal(preview.android.package, "com.realxpen.moniflow.sandbox");
      assert.equal(preview.extra.nativeWalletFeaturesEnabled, false);
      assert.ok(!preview.plugins.includes("./plugins/with-bmoni-sdk.js"));
      assert.ok(preview.autolinking.android.exclude.includes("@bkey-inc/bmoni_embedded_sdk"));
    });
    withPreview(false, () => {
      process.env.EXPO_PUBLIC_MONIFLOW_SANDBOX_PREVIEW = "1";
      assert.throws(() => config({ config: base }), /must use the signer-free/);
    });
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_MONIFLOW_SANDBOX_PREVIEW;
    else process.env.EXPO_PUBLIC_MONIFLOW_SANDBOX_PREVIEW = previous;
  }
});
