# PR #65 — One new Waydroid x86_64 UI-only build

Approval: REQUEST_ONE_MONIFLOW_PR65_WAYDROID_X86_64_APK_20261022

On October 22, 2026, the MONIFlow owner explicitly approved **one new Waydroid x86_64 UI-only APK build**, with BMONI signing and financial operations disabled, from `6afa11e0515d2664d63be640d4437636136568d6` (squash-merged PR #65). Purpose: verify latest Home, Pockets, Activity, Profile and bottom-safe-area fixes on Waydroid without changing the app.

Only the unique approval ticket, guarded workflow, CI test registration, source test, and QA notes may be introduced with this pull request. Its merged `main` parent must be exactly `6afa11e0515d2664d63be640d4437636136568d6`. If that base changes, the workflow must abort without starting Expo. An identical ticket cannot be used again; reruns are prohibited even after failed/queued/timed-out builds.

The existing Expo project `@xpen/moniflow` is used with profile `waydroid-x86-apk`, package `com.realxpen.moniflow.waydroid`. Exclude the BMONI ARM64 native signer, omit ARM native libraries, and block financial API writes. Run full code and financial-safety checks before submitting **exactly one** EAS Android x86_64 build, await Expo FINISHED, inspect APK ZIP/ABI, record SHA-256, and publish **non-secret evidence only**.

Approval does not include physical ARM64/iOS builds, production deployment, live BMONI provider requests, signing, account linking, wallets, KYC, PIN/key handling, refunds or transactions. A new build may consume Expo build credits. A completed build is not device UI verification and all phone/provider capabilities remain unverified.
