# MONIFlow physical Android preview (2026-10-19)

This change prepares ONE installable Android APK for the existing Expo project, without Appetize.

## Build profile
- Existing EAS project `@xpen/moniflow`, ID `3d986249-f72b-494b-9ceb-eef8335a5ae0`.
- `apps/mobile/eas.json` profile `android-apk` extends internal `preview`, has `developmentClient: false` and explicit `android.buildType: apk`. It uses exactly the same **public** API URL, Supabase URL and Supabase publishable key as the earlier iOS simulator preview. No wallet signing secret or server credential is embedded in mobile.
- `apps/mobile/app.json` Android package `com.realxpen.moniflow` is unchanged. The BMONI native config plugin remains present; first physical Android SDK compilation must be independently proven by EAS.
- No provider identity, wallet or funds are simulated or exposed as real.

## One-time cloud submission
- Merge the configuration/workflow PR after both CI jobs pass.
- First creation of `docs/ANDROID_APK_PREVIEW_ONE_SHOT_20261019.md` on `main` with the exact owner-approved marker starts the workflow. General pushes and workflow retries must not submit another build.
- The workflow checks `EXPO_TOKEN` presence, Expo project continuity, TypeScript and source regression, unsigned 401 on /api/auth/session and /api/workspace/overview, and /health/provider showing both financial activation flags disabled.
- It submits `eas build --platform android --profile android-apk --non-interactive --no-wait --json` **once** and records the returned EAS build ID in its GitHub Actions summary. A successful GitHub job proves *submission*, not successful Gradle compilation or an installable artifact. First-time Android signing/keystore setup may require Expo-side configuration; never assume it succeeded.
- There is no Play Store submit, app deployment, database change, BMONI create-user, financial authorization, wallet provisioning, KYC or transfer.

## Owner device acceptance
1. Open https://expo.dev/accounts/xpen/projects/moniflow/builds and select Android. Open the **exact build ID** from the successful submission run; verify status **Finished** and artifact type **APK**, not AAB or iOS archive.
2. On an Android phone, use the finished build's Install/Download link. Permit installation from the chosen browser/files app if Android asks; only trust this `@xpen` build. This is a preview, not a Google Play release.
3. Sign in using a disposable Supabase test account. Confirm API session, open Home and tap Refresh account status. Verify truthful not-linked/no-wallet or a safe error; capture a screenshot with no credentials visible.
4. Inspect fresh Vercel logs if workspace returns 503. A working Android installation does not prove database readiness or BMONI identity/wallet ownership.

## Restrictions
BMONI device private keys must stay on-device. Do not enter real BVN, NIN, wallet PINs, bank credentials or real customer funds into preview builds. Device signing is **not authorized/tested** by this APK workflow. Do not automatically pair the public synthetic BMONI fixture with the signed-in user.
