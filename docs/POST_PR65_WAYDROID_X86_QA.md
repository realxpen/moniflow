# PR #65 Waydroid x86_64 UI QA — latest safe-area fixes

Source baseline: `6afa11e0515d2664d63be640d4437636136568d6` (merged PR #65); profile `waydroid-x86-apk`. Owner approval covers **one UI-only** APK build, not financial features.

## Reason for fresh build
Screenshots of the preceding Figma Waydroid preview show Home with “Your money, in focus.”, distinct Pockets, Activity and Profile, and recognized signed-in API session. But Pockets and Activity placed duplicated account-readiness cards before tab content, and the floating tab navigation overlapped the Android system navigation area. PR #65 refactors this hierarchy and adjusts bottom safe-area offsets.

## Automatic checks
GitHub workflow requires a first-created approval ticket, exact previous main SHA, first run attempt, and a diff of ONLY five approved files. It runs TypeScript, automated tests, web export, provider safety checks, Expo config, x86_64 native autolinking and prebuild; BMONI native SDK and financial writes remain excluded. At most one EAS x86_64 APK is submitted and must report FINISHED; ZIP/ABI and SHA-256 are verified with non-secret metadata.

## Device acceptance (after installing new APK)
- On Waydroid, update **MONIFlow Waydroid** (`com.realxpen.moniflow.waydroid`), not the ARM64 `MONIFlow` package. On install signature conflict, stop to protect existing data.
- Verify cold start and Home “Your money, in focus.” with no invented balances.
- Pockets and Activity should now show their individual educational information and CTA before compact account-access notes linking to Profile.
- Profile must retain detailed readiness and session controls; signed-out owner API calls stay blocked.
- Bottom tab bar clears Android system nav; scrolling reaches final controls. Check tabs, font scaling and TalkBack if available.
- Try account switching and offline/reconnect using disposable identities only; redact email/identifiers in any screenshot.

**Not authorized:** BMONI native wallet/signing, PIN entry, real KYC, provider money movement, production deployment or additional builds. The one-time ticket is consumed on first use. Track actual UI findings in [GitHub issue #62](https://github.com/realxpen/moniflow/issues/62).
