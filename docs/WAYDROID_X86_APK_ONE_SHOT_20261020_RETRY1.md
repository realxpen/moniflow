# Single remaining owner-approved Waydroid APK attempt — preflight retry

Approval: REQUEST_ONE_MONIFLOW_WAYDROID_X86_APK_BUILD_20261020

Date: 2026-10-20 (Nigeria time)

This is NOT approval for a second Expo EAS build. It reuses the owner's still-unused authorization for exactly ONE `waydroid-x86-apk` build following the squash merge of PR #39.

The original one-time approval ticket was committed as `docs/WAYDROID_X86_APK_ONE_SHOT_20261020.md`. GitHub Actions run [39434060256](https://github.com/realxpen/moniflow/actions/runs/39434060256) failed at its **first** step, "Verify new one-time approval ticket only", before dependency installation, Expo authentication or the EAS submission command. The logs show `fatal: Not a valid commit name 9966a86a0575dc721d126a5a80556cc86da2e1ea` because the workflow checkout was shallow (`fetch-depth: 2`). Exactly **zero** EAS build requests were submitted by that failed workflow.

The approval workflow now uses full history (`fetch-depth: 0`) and requires this unique new ticket, the original approval ticket, the merged PR commit, safe original Expo identity, BMONI signer exclusion, x86_64 Gradle prebuild checks, private API 401 gates and disabled financial flags.

**Authorized action:** if and only if all safety checks pass, submit exactly ONE new Expo EAS `waydroid-x86-apk` Android build to the existing `xpen/moniflow` project with `--non-interactive --no-wait --json`.

There is no authorization for additional builds after one EAS submission, retries of an already-submitted build, Vercel deployments, changes to the production Android package, or financial execution in Waydroid. The new APK will still need an independently verified **Finished** status and `lib/x86_64/libreactnative.so` before installation testing.
