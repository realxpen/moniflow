# One-time Waydroid build recovery after PR #66 preflight cancellation

Approval: REQUEST_ONE_MONIFLOW_PR66_RECOVERY_WAYDROID_X86_64_APK_20261022

**Source for renewed owner review:** `1d88ada4899e882b78491e3378d95bc397e9c067`. The user previously approved **one** Waydroid x86_64 UI-only APK to verify the navigation and tab layout fixes in merged PR #65. [PR #66](https://github.com/realxpen/moniflow/pull/66) was merged on 22 October 2026, but its [GitHub run #39772991236](https://github.com/realxpen/moniflow/actions/runs/39772991236) **failed at the very first source-SHA safety check**, before Expo authentication and before the EAS build step. **Zero APKs were submitted by that run.**

The source changed between preparation and merge because [PR #67](https://github.com/realxpen/moniflow/pull/67), which fences stale asynchronous sign-in/signup responses and clarifies offline Operator confirmation, merged first. The old source approval `6afa11e0515d2664d63be640d4437636136568d6` could not cover this change. This recovery ticket is therefore an **explicitly reviewable, new source-bound proposal**. **Squash-merging this new PR confirms approval for the one still-unbuilt preview on the updated source.** Do not merge without owner review of this difference.

The requested outcome is **one new Waydroid x86_64 UI-only APK**, and only one; this is recovery of the unsubmitted build, not permission for a second build., profile `waydroid-x86-apk`, package `com.realxpen.moniflow.waydroid`, Expo project `@xpen/moniflow`. The BMONI Android signing SDK is excluded, financial API writes remain disabled, and no real funds are involved.

The workflow must verify: first-created unique ticket, exact previous `main` commit `1d88ada4899e882b78491e3378d95bc397e9c067`, first workflow attempt only, exactly five documentation/CI/workflow/test changes and no application/backend code changes. It runs TypeScript, full unit suite, web export, PostgreSQL/Waydroid static gates, provider protection checks, Expo native autolinking and x86_64 prebuild isolation before submitting exactly one EAS APK. Expo must return FINISHED, and APK ZIP, x86_64 `libreactnative.so`, absent ARM libraries and SHA-256 must be verified. Share only non-secret build metadata.

Never rerun any previously spent one-shot ticket, even following a failed/queued build. No production deployment, native signer, wallet, KYC, onboarding, provider financial calls or payments are authorized. The merge may consume Expo build credits. Device UI acceptance still requires installing the finished APK.
