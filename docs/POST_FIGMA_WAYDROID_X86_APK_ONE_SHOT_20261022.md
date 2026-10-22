# MONIFlow one-time post-Figma Waydroid x86_64 UI-only build

Approval: REQUEST_ONE_MONIFLOW_FIGMA_WAYDROID_X86_64_APK_20261022

On October 22, 2026, the owner explicitly approved **one new Waydroid x86_64 UI-only APK build**, with BMONI signing and financial operations disabled, after confirming that the prior Waydroid build launched but contained the older UI.

Approved main app source: `c1db693b8740798320613d1f5071bd7d69b76451` (squash-merged PR #61). The distinct preview is the existing `waydroid-x86-apk` EAS profile and Android package `com.realxpen.moniflow.waydroid`. Its shared Expo project is `@xpen/moniflow`.

## Exact limits

- At most **one** EAS Android build submission, on the owner's squash-merge of the reviewed pull request. Never retry/rerun even if the build fails, times out or exits queued.
- The workflow must verify the previous main SHA is the above approved source and this ticket was first created in this merge. No app, backend, dependency, config, identity, wallet, financial-rule or secret changes may accompany the build ticket.
- Require pre-build TypeScript, tests, Expo web export, standalone Waydroid x86_64 config/autolinking/prebuild checks and independent API read-only/financial-disable checks.
- Only `eas build --platform android --profile waydroid-x86-apk --non-interactive --wait --json` may submit a build; use Expo's actual FINISHED state to claim completion.
- Verify resulting APK ZIP, `lib/x86_64/libreactnative.so`, absence of ARM64 libs, SHA-256 and source/build ID. Keep the APK on Expo; upload non-secret evidence only to GitHub.
- No production release, store submission, update, deployment, simulated provider success, wallet PIN/key storage, signing, BMONI provider writes, account linking, KYC or real funds.
- Waydroid x86_64 is **UI-only**. Approval does not cover a physical ARM64 phone build or a new iOS build.

Squash-merging this PR triggers the one-time workflow automatically if all guards pass; it may consume Expo build credits. Installation, cold-start, accessibility, app navigation and financial provider testing remain separate and unverified until actually performed. This ticket does not authorize any subsequent build.
