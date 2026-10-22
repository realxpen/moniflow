# Recovery Waydroid x86_64 UI-only APK — PR #65 navigation acceptance

**Candidate source:** `1d88ada4899e882b78491e3378d95bc397e9c067` (includes PR #65 layout/safe-area fixes and PR #67 auth reliability fixes). **Old PR #66 run:** [39772991236](https://github.com/realxpen/moniflow/actions/runs/39772991236), aborted at source gate; Expo was not invoked. The original build approval did not create an APK.

The recovery is a separate, narrowly scoped owner-review-and-merge trigger: first-created ticket and exact source hash, five-file diff allowlist, first attempt only. The Waydroid preview uses package `com.realxpen.moniflow.waydroid` and profile `waydroid-x86-apk`, with BMONI native signing excluded and financial API writes disabled.

Before Expo, CI checks TypeScript, web export, tests, server authentication protection, disabled provider flags, Gradle `reactNativeArchitectures=x86_64`, excluded BMONI SDK/autolinking and no native ARM Maven repository. It submits at most one `eas build` and requires Expo FINISHED and actual x86_64 APK ZIP/ABI/SHA-256 validation. The APK remains in Expo; GitHub stores non-secret evidence only.

**After a completed build, test in Waydroid:** open updated MONIFlow Waydroid; confirm Home "Your money, in focus."; Pockets and Activity prioritize their own educational panels above the compact readiness link; bottom tab bar is above the system navigation bar; scroll to Profile and API-session bottom actions; tab labels announce correctly; sign-out, account change and stale sign-in responses cannot leak the previous owner's data. Use disposable identities and redacted screenshots only.

**Do not** test real BMONI signing, account creation, KYC, PINs, provider transfers or production finances in Waydroid. Do not reuse the previous one-time ticket. Record installation and UI findings in [QA issue #62](https://github.com/realxpen/moniflow/issues/62). A green build is not proof of native UI acceptance.
