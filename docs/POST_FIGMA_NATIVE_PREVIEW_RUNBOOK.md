# Post-Figma v6 Android ARM64 Preview — Build and Device Acceptance

**Scope:** Non-production physical Android preview. Design: https://www.figma.com/design/Ir1EG2ui7qVhVuSrYoU917. This runbook does not approve any transaction or production deployment.

## Trigger

After reviewing the PR containing the new one-shot ticket and workflow, **squash-merge into main**. The job starts only if the one-time approval file is first introduced at the expected parent commit `d02c7887dd1c8f526e5cc6ebe8fa6bb9f32a8a04`. If `main` advances, the build deliberately aborts; a new review is required. Do **not** rerun a job to get another build.

## Automated proof (no terminal or local laptop required)

1. GitHub Actions job checks app source, TypeScript, unit/integration suite, web export, Android profile isolation, signed-out API protection and disabled financial feature flags.
2. Existing Expo project `@xpen/moniflow` receives exactly one `android-apk` build.
3. Job waits for Expo to report **FINISHED**. A mere submission, queued build or build URL is not evidence of compilation.
4. Runner downloads the signed artifact temporarily, checks ZIP validity and `lib/arm64-v8a/libreactnative.so` for actual ARM64 app content, rejects x86 libraries and records a SHA-256.
5. Job emits the Expo build page, source SHA, outcome and non-secret `moniflow-post-figma-apk-evidence` artifact. The APK is not rehosted in public GitHub artifacts.

## Device acceptance (still requires an actual device/runtime)

- Open the exact Expo build link in the Actions summary, download the completed APK onto a **supported ARM64 Android phone** (not the x86_64 Waydroid preview), and verify the package can install/upgrade without discarding valuable existing local data.
- Confirm clean launch, sign in with a disposable account and navigate Home, Pockets, Activity, Profile, Operator, Plan and Guard. Financial data should remain withheld where not authorized. An app launch alone does not prove the BMONI signer.
- Check 100%, 150%, 200% Android text scaling and TalkBack navigation. iOS VoiceOver still needs a separately approved compatible iOS build.
- Verify approval is distinct from device signature and provider confirmation; REVIEW, BLOCK, FAILED and unknown statuses cannot appear as success. Do not attempt real financial execution.
- Test sign-out/account switch, airplane mode and background/restore with disposable accounts, no secret logging.
- Log only redacted screenshots and non-sensitive outcome notes. Do not share PINs, BMONI credentials, real BVN/NIN, JWTs, phone identities or private wallet keys.

## Release decision

**HOLD:** No production financial activation until native UI/device QA, BMONI ownership and KYC evidence, provider sandbox confirmations, secure signing and independently reconciled ledger outcomes are all confirmed with separate owner approval. The APK is an internal test build, not a production release.
