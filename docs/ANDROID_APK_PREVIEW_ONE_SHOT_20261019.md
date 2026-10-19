# One-Time Owner Approval — MONIFlow Android APK Physical Device Preview

Approval: REQUEST_ONE_MONIFLOW_ANDROID_APK_BUILD_20261019

On 2026-10-19 the owner explicitly instructed us to configure and submit exactly ONE Android APK preview build for their physical Android phone using the existing Expo project and existing public Supabase/API settings.

The configuration and guarded workflow were reviewed in PR #36 and merged at commit `c9d5e7a11fb4d572749a3111e34a6b3291f32c05`. This one-time ticket authorizes one GitHub Actions job attempt to run `eas build --platform android --profile android-apk --non-interactive --no-wait --json` against linked `@xpen/moniflow`, Expo project `3d986249-f72b-494b-9ceb-eef8335a5ae0`.

Scope: one installable Android internal-distribution APK for a disposable Supabase sign-in, read-only Home/Pockets/Activity/Profile account readiness, and API 503 diagnostics. The workflow must confirm authenticated endpoints deny unsigned requests and provider financial flags remain disabled before submission. No Appetize use, Apple/iOS build, EAS project creation, Google Play submission, payment, KYC, real wallet, private account pairing or money movement. A new build submission is NOT evidence of successful Gradle compilation; check Expo's build status and APK artifact separately. Do not rerun this ticket or automatically submit another build if it fails.
