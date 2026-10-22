# MONIFlow MVP — one approved release-candidate Android build per architecture

Approval: REQUEST_ONE_EACH_MONIFLOW_MVP_WAYDROID_X86_AND_ANDROID_ARM64_PREVIEW_20261022

- Exact immutable application source: `64f79a765ad1df043958415366eb25974e547b2d` (merged security consolidation PR #74).
- Approved by owner in current conversation: "Ok do recommendations and next", referring to one fresh Waydroid x86_64 APK and one separate Android ARM64 internal preview APK. This ticket may be created once; it must never authorize any subsequent rebuild.
- EAS profiles: `waydroid-x86-apk` (package `com.realxpen.moniflow.waydroid`, no BMONI native signer, all API mutations blocked) and `android-apk` (package `com.realxpen.moniflow`, existing ARM64 BMONI native SDK; financial execution still blocked by application/server state).
- GitHub Actions on `main` must verify that this exact ticket was absent from the immediately previous commit, that **no application source** changed with the release ticket, that the pinned source matches `github.event.before`, and that no reruns can start another EAS build.
- Run complete typecheck, Vitest, Expo web export and release-profile checks before submitting either build.
- EAS must finish and provide a real APK URL; download each APK within GitHub Actions and validate archive integrity, ABI and SHA-256. Store metadata only; do not publish APK files, wallet keys or API credentials to GitHub.
- The physical ARM64 preview build does **not** authorize BMONI signup, wallet creation, PIN, signing, KYC or money movement.
- Both builds initially use the pre-existing published MONIFlow API URL with financial capabilities closed. The isolated sandbox staging API is **not live** because Vercel returned HTTP 402 daily-limit exhaustion. Therefore the API-backed simulated view may not work in these builds; the local Figma demo remains testable.
- Device cold-start, account switching, deep links, accessibility and physical owner-ownership signature are NOT verified by a successful cloud build and require separate QA.

These are test/distribution APKs only, not a Google Play submission or live financial deployment. Review Expo account build quotas and device compatibility separately.
