# MONIFlow Phase 28 — one-time Expo iOS Simulator build approval

Approval: REQUEST_ONE_PHASE28_MONIFLOW_IOS_SIMULATOR_BUILD_20261016

**Requested by the project owner in ChatGPT on 2026-10-16:** "build next recommendation" after Phase 28 merged on main as `d7ebd225788c3fbaf71a15c3d4c94ef97a0d8f3f`.

This new-file release ticket is the *only* trigger for `.github/workflows/phase28-ios-simulator-once.yml`. The first creation of this file on `main` requests exactly ONE Expo EAS native iOS **Simulator** build through existing `@xpen/moniflow` (project ID `3d986249-f72b-494b-9ceb-eef8335a5ae0`). It verifies owner, existing project, source typechecks and Phase 28 checks before requesting the build.

- No Apple Developer membership or user-side Linux terminal.
- Uses the existing GitHub Actions `EXPO_TOKEN` repository secret; never log it.
- The action submits one build with `--no-wait`; GitHub success is NOT proof Expo compilation finished.
- Explicitly no physical iPhone `.ipa`, TestFlight or Apple signing.
- No real BMONI user creation, wallet/owner signing, KYC, funds, simulation activation or provider mutation.
- No Vercel production deployment or automatic Appetize update.
- Job reruns and later updates to this already-existing ticket must fail closed; a separately authorized future build may use the existing manually dispatched workflow.
- The Expo simulator profile still has only the API URL; actual signed-in testing remains blocked until reviewed publishable Supabase preview config is connected.

After the workflow runs, inspect the new Expo build status. If successful, download the new simulator archive and **update the existing MONIFlow Appetize app** to test the stage-scrolling fix and improved disclosure/readiness screens. Do not treat an Appetize emulator as secure wallet hardware.
