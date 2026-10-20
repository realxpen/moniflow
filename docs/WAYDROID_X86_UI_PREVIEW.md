# MONIFlow Waydroid x86_64 — Read-only APK proposal

Status: **PR #39 merged and exactly one Waydroid EAS build submitted** ([Expo build d45c9566-bb4e-45c0-9221-765299666500](https://expo.dev/accounts/xpen/projects/moniflow/builds/d45c9566-bb4e-45c0-9221-765299666500)). Submission succeeded; APK Finished status, library ABI and cold-start are still unverified. The one-time build approval is spent. No further builds, deployments or BMONI financial capabilities are approved.

## Why

The owner's Ubuntu 24.04 laptop runs Waydroid Android 13 with native `x86_64,x86` support. The existing Android phone APK only packages `lib/arm64-v8a/libreactnative.so`. Although the community libhoudini ARM translation layer allowed installation, Waydroid logged `com.facebook.soloader.SoLoaderDSONotFoundError: couldn't find DSO to load: libreactnative.so` at app startup.

BMONI's official React Native example states that its Android signer AAR ships only `arm64-v8a`. Do not expect its native wallet signer to work on x86_64. Sources: https://github.com/bkey-inc/bmoni-embedded-reactnative-example and https://docs.expo.dev/modules/autolinking/.

## Separation

- **Normal phone build:** `app.json` stays unchanged. `android-apk` EAS profile keeps the `com.realxpen.moniflow` package, BMONI config plugin, arm64 Gradle architecture and native wallet/signing SDK.
- **Opt-in Waydroid preview:** EAS profile `waydroid-x86-apk` extends the regular Android APK profile, setting only `EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW=1`. The conditional `app.config.js` gives the build the distinct `com.realxpen.moniflow.waydroid` package, `moniflow-waydroid` deep-link scheme and `MONIFlow Waydroid` name. It substitutes the x86_64 Gradle plugin for the BMONI Maven/ARM64 plugin.
- **Autolinking:** `react-native.config.js` disables Android autolinking for `@bkey-inc/bmoni_embedded_sdk` only when the preview flag is set. Do not delete the package from the real app or enable the BMONI plugin for the preview.
- **Runtime:** `bmoni-device.native.ts` never loads the BMONI module on Waydroid; `available` is false, `initialize` is a no-op, and attempts to perform wallet, PIN or signing actions fail with an explicit error.
- **Financial safety:** `apiFetch` rejects non-GET/HEAD requests to MONIFlow's configured API in the preview. Supabase sign-in remains available through its separate authentication client. Offline educational simulation remains distinct from real money. The production API's provider registration and authenticated financial demo remain disabled independently of this app.

The profile is strictly for navigation, UI rendering, authentication and owner-scoped read-only API workspace/reconciliation screens. It does **not** prove device wallet ownership, live BMONI SDK support, KYC, or ability to execute money operations.

## Review/validation (no EAS build)

From the repository root:

```bash
pnpm install --no-frozen-lockfile
node --test scripts/waydroid-x86-preview.nodecheck.mjs
pnpm typecheck
pnpm test
```

Before **any approved** APK build, also verify the actual Expo Android config and autolinking output. From `apps/mobile` with dependencies installed:

```bash
# Inspect only. Does not compile or submit any EAS build.
EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW=1 pnpm exec expo config --json

# Inspect React Native autolinking: BMONI must be absent/Android-null.
EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW=1 pnpm exec expo-modules-autolinking react-native-config --platform android
```

Check that the preview config uses `com.realxpen.moniflow.waydroid`, that `reactNativeArchitectures` resolves to `x86_64` during prebuild, and that `@bkey-inc/bmoni_embedded_sdk` is not linked into the Android project. The static node checks alone cannot prove that the native APK compiles.

## Release gates

1. PR receives green CI, code review and explicit owner permission to merge. **Do not auto-merge.**
2. Owner separately authorizes **one** `waydroid-x86-apk` EAS build submission; the existing Phase 33A one-shot approval is exhausted and cannot be reused. There is no automatic build workflow in this change.
3. Confirm EAS build is **Finished** (not merely accepted), obtain its actual APK path, then inspect APK ABIs. Expected `lib/x86_64/libreactnative.so` and **no linked BMONI signer**.
4. Install on Waydroid and prove cold start, navigation, sign-in, authenticated owner workspace, Profile reconciliation, and absence of crashes. Never enter a device signing PIN or attempt wallet creation, owner proof or financial execution there.
5. Continue testing actual BMONI signing only on a supported physical ARM64 Android phone.

If autolinking exclusion, build, native library inspection, or device test fails, treat the preview as blocked. Never restore unsafe native wallet calls or claim simulated provider success.
