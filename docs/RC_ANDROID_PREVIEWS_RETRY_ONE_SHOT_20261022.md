# MONIFlow Android MVP previews — pre-Expo tooling fix and one bounded retry

Approval: RETRY_ONE_EACH_MVP_ANDROID_AFTER_VERIFIED_PRE_EXPO_PNPM_FAILURE_20261022

- Initial approved ticket `docs/RC_ANDROID_PREVIEWS_ONE_SHOT_20261022.md` was consumed by GitHub run [39822412024](https://github.com/realxpen/moniflow/actions/runs/39822412024).
- BOTH matrix jobs failed during **actions/setup-node pnpm cache lookup**, before pnpm installation, Expo authentication, or any EAS build call. Explicit job-step conclusions: `Authenticate to the existing Expo project: skipped`, `Submit exactly one APK: skipped` for **both** profiles. **No Expo APK was submitted** from the initial ticket; no capacity was consumed.
- This is a technical repair of the already approved request for one x86_64 Waydroid and one ARM64 Android MVP internal preview, not permission to build additional APKs.
- Pin exact application source `64f79a765ad1df043958415366eb25974e547b2d`; pin the release workflow immediately preceding commit `4829f90e5c755b63d2bd3521f1480c0b58b8e6c3`.
- Only changed source in the new merge: `.github/workflows/rc-android-previews-once.yml` (enable pnpm before the Node cache) and this first-created retry ticket.
- The workflow must verify first creation, pin both commit hashes and `run_attempt=1`, and fail closed on an altered or concurrently modified application source.
- If either EAS build starts, do not create any further retry ticket for that architecture without a fresh explicit owner approval. Builds must wait for `FINISHED` and validate actual ABI & APK archive.
- **No** production release, BMONI onboarding, KYC, wallet signing, financial transaction, Hustle live settlement, or deployment of the isolated staging API. Its preview deployment remains blocked by Vercel HTTP 402 daily-limit exhaustion.

References: failed pre-Expo run #39822412024 and merged PR #75.
