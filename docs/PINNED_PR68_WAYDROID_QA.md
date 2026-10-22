# MONIFlow pinned Waydroid x86_64 UI-only preview — acceptance

**Exact mobile build source:** `1d88ada4899e882b78491e3378d95bc397e9c067`, containing the PR65 tab/safe-area fix and PR67 sign-in reliability changes. The one-time workflow is triggered by a later GitHub merge, but **builds this pinned source**. This decouples mobile code identity from unrelated new backend PRs and avoids the PR66/PR68 race.

## Automated evidence

- New first-use ticket, first GitHub workflow attempt, exact five-file merge scope and source commit ancestor.
- Checkout pinned commit **before** pnpm installation, TypeScript, full app tests, Expo web export, profile checks and EAS build.
- Guarded x86_64 preview package `com.realxpen.moniflow.waydroid`; native BMONI signing excluded, no provider financial writes.
- One EAS Android build submission at most. FINISHED Expo artifact, ZIP x86_64 ABI and SHA-256 required; metadata records **both pinned source and trigger** commits.

## UI acceptance (after Expo finishes)

Install `MONIFlow Waydroid` via the downloadable Expo APK using Waydroid's installer, not the ARM64 phone package. If Android reports an app-signing mismatch, do not uninstall and lose data. Confirm the app launches, Home reads **“Your money, in focus.”**, Pockets and Activity show educational content *before* a compact readiness link, and Profile retains detailed verification steps. Check the floating tabs clear the Android system navigation bar, bottom buttons remain scrollable, and the API session screen recognizes a disposable account. Exercise signing out and stale login handling, plus TalkBack and larger text when possible.

Only UI testing: no BMONI signer, PIN, wallet, KYC, provider payments or transactions. Green CI/build is not proof of device acceptance. Report redacted screenshots and results in [issue #62](https://github.com/realxpen/moniflow/issues/62).
