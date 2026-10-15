# Phase 26 — MONIFlow cloud-only iOS Simulator via Expo

Date: 2026-10-15. This milestone is deliberately about an **iOS Simulator build**, not a physical iPhone install and not BMONI wallet proof. No Apple Developer Program membership, Mac, Xcode or Linux terminal commands are required from the user.

## Evidence and current source

- The app lives in `apps/mobile` in a pnpm workspace. Its `app.json` already sets the iOS bundle identifier `com.realxpen.moniflow` and includes the native BMONI SDK configuration plugin.
- `apps/mobile/eas.json` now includes `ios-simulator`, extending the standalone `preview` distribution profile, with `ios.simulator: true`. This intentionally bundles JavaScript (no Metro server / Expo Go needed).
- Only the public `EXPO_PUBLIC_API_URL=https://moniflow-api-silk.vercel.app` is embedded in the app. `EAS_NO_FROZEN_LOCKFILE=1` temporarily matches MONIFlow CI's existing `--no-frozen-lockfile` policy until we reconcile the root pnpm lockfile. Remove this workaround when the lock is regenerated and validated in frozen mode. It is not a secret.
- The browser-triggered workflow is `.github/workflows/eas-ios-simulator.yml`. It only accepts manually dispatched events on main and demands the exact approval `LINK_AND_BUILD_MONIFLOW_IOS_SIMULATOR`. Expo authentication uses a **GitHub Actions secret** `EXPO_TOKEN`. No secret is committed or logged.
- Initial GitHub run #2 (38753238741) linked [@xpen/moniflow](https://expo.dev/accounts/xpen/projects/moniflow) with EAS project ID `3d986249-f72b-494b-9ceb-eef8335a5ae0`. It submitted [iOS Simulator build aee7b52f](https://expo.dev/accounts/xpen/projects/moniflow/builds/aee7b52f-2ae1-431a-9e02-bef7d012ebd4). The **final EAS build status has not been verified**; GitHub success only proves submission. Future manual runs validate the persisted Expo owner/ID, execute read-only `eas project:info`, and submit one build without running `eas init`, auto-creating or relinking another project.
- The original Expo linking wrote `extra.eas.projectId` in a temporary GitHub runner. It is now saved permanently with `owner: xpen` in `apps/mobile/app.json`. The workflow fails closed if an operator supplies another Expo owner or the project ID is changed.
- Existing native BMONI signing requires secure on-device key ownership; cloud simulators are not proof of Secure Enclave / Keychain behavior, customer identity, KYC, managed CNGN wallet status or BMONI transfer settlement.
- The previously created synthetic BMONI sandbox account is public to the workflow logs. It MUST NOT be silently attached to a personal account, funded or used for personal documents. Existing API partner onboarding and authenticated demo flags remain disabled.

## What the Expo-account owner does (browser only)

1. Open [Expo personal access tokens](https://expo.dev/settings/access-tokens), sign in, choose **Create token**, name it for this GitHub MONIFlow simulator workflow, and copy it.
2. Open [MONIFlow GitHub Actions secrets](https://github.com/realxpen/moniflow/settings/secrets/actions), choose **New repository secret**, set **Name = EXPO_TOKEN** and paste the token as the value. **Never send the token to ChatGPT, include it in a screenshot, commit it, or place it in a GitHub workflow input.**
3. Open [MONIFlow iOS Simulator — Expo Cloud Build](https://github.com/realxpen/moniflow/actions/workflows/eas-ios-simulator.yml), choose **Run workflow** on branch **main**.
4. Enter **`xpen`** exactly, in lowercase, as `expo_owner`. The project is now bound to that Expo account and cannot be silently moved to another account.
5. Enter exactly `LINK_AND_BUILD_MONIFLOW_IOS_SIMULATOR` in `approval` and run once.
6. GitHub validates source, checks the **existing** linked Expo project via `eas project:info`, and submits exactly one iOS Simulator cloud build. Check the Expo build page before triggering another build.
7. The public Expo project ID has been saved. Share only the completed EAS build status/errors (never the token) so we can troubleshoot compilation and browser-hosted simulator eligibility.

MONIFlow is already linked to @xpen/moniflow. If future runs report project/owner mismatch, STOP and verify that project; never force-initialize or relink to another account.

## Running the simulator after an EAS build

Expo produces an iOS **simulator artifact** (`.app`, often compressed) that is **not** an iPhone-installable `.ipa`. Depending on Expo-account eligibility, [Expo Simulators](https://docs.expo.dev/eas/cli/) can start a browser-hosted remote simulator from a completed EAS Build (`eas sim:availability`, `eas sim:start --platform ios --build-id ...`); the capability is experimental and may be gated or metered. Alternative browser-hosted simulator services require their own access/terms. None of this constitutes testing iOS Secure Enclave private-key signing on a physical iPhone.

Without Apple Developer Program credentials, use the existing MONIFlow Safari web app for iPhone interaction. The native BMONI SDK cannot execute in Safari or Expo Go. Native device signing remains blocked pending authorized iOS device signing or a separate approved physical Android test strategy.

## Evidence before claiming success

- GitHub CI and phase26 configuration tests pass.
- EAS project linked under the **correct Expo account**, stable `projectId` saved in source.
- EAS iOS Simulator build status is **FINISHED**; do not confuse GitHub successful dispatch with completed EAS binary compilation.
- Browser-hosted simulator app launches and reaches the existing HTTPS API. No claim of production BMONI KYC or financial operations without explicit provider evidence.
- Vercel's latest code release remains independently subject to the Hobby deployment quota. Building iOS with Expo does not publish Vercel.

Official docs:
- https://docs.expo.dev/build-reference/simulators/
- https://docs.expo.dev/build/building-on-ci/
- https://docs.expo.dev/build-reference/build-with-monorepos/
- https://docs.expo.dev/accounts/programmatic-access/
- https://docs.expo.dev/eas/cli/
