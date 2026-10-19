# One approved Phase 33A Android APK build — release plan (2026-10-19)

## Owner authorization

The owner requested exactly **one updated Android APK** with the merged Phase 33A Profile identity reconciliation UI, using the existing Expo account/project and public Supabase/API configuration. This build does not create or link BMONI identities, provision wallets, submit KYC, enable transactions or move funds.

## Source and environment gates

- The main branch already includes Phase33A PR #37 and production API deployment `7587c88bcc04ea43855c097ba7070e953cff9ed8`.
- The production provider health endpoint returned HTTP 200 with `provider=bmoni`, `partnerRegistrationEnabled=false` and `authenticatedSandboxDemoEnabled=false`.
- The new one-shot workflow checks `GET /api/auth/session`, `GET /api/workspace/overview`, and `GET /api/workspace/reconciliation` each return `401 AUTH_REQUIRED` to anonymous callers; it must abort before EAS if any fails.
- It verifies Expo project continuity (`@xpen/moniflow`, existing project ID and Android package), `android-apk` profile's installable `.apk` and internal distribution, existing public Supabase publishable key and API URL, source guard tests and TypeScript.
- Creating `docs/PHASE33A_ANDROID_APK_PREVIEW_ONE_SHOT_20261019.md` **for the first time on main** with owner marker `REQUEST_ONE_MONIFLOW_PHASE33A_ANDROID_APK_BUILD_20261019` triggers one job, only `run_attempt=1`. Any later commits or reruns must not request another build.
- The workflow makes exactly one `eas build --platform android --profile android-apk --non-interactive --no-wait --json` call and records its returned build ID in the job summary. Expo build completion (or failure) is a separate condition.

## Physical-device acceptance

Once Expo reports `Finished`, download the new APK from the **exact Expo build ID** and install/update MONIFlow on the physical Android phone. A release may require uninstall/reinstall if Android's signing/package version policy blocks replacing the previous APK; avoid uninstalling until the new APK is confirmed installable and the user has no data to preserve. Then sign in with a disposable user and visit Profile. Profile should show **EVIDENCE NEEDED**, **UNVERIFIED**, or **MANUAL REVIEW**, or a conservative `NOT VERIFIED` error. It must not claim a verified BMONI wallet, expose financial balances or allow provider money movement.

The installed APK does not update simply because GitHub code merged or the Vercel API changed. No further EAS submissions are authorized without a separate request.

## Privacy

Never share real BVN/NIN, database URI, signing keys, PINs, private phone fingerprints, access tokens or financial credentials in GitHub, Expo logs, screenshots or chat. Use no public BMONI synthetic identity as proof of possession of the signed-in user's real provider account.
