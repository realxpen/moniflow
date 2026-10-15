# Phase 26 — MONIFlow cloud-only iOS Simulator via Expo

Date: 2026-10-15. This milestone is deliberately about an **iOS Simulator build**, not a physical iPhone install and not BMONI wallet proof. No Apple Developer Program membership, Mac, Xcode or Linux terminal commands are required from the user.

## Evidence and current source

- The app lives in `apps/mobile` in a pnpm workspace. Its `app.json` already sets the iOS bundle identifier `com.realxpen.moniflow` and includes the native BMONI SDK configuration plugin.
- `apps/mobile/eas.json` now includes `ios-simulator`, extending the standalone `preview` distribution profile, with `ios.simulator: true`. This intentionally bundles JavaScript (no Metro server / Expo Go needed).
- Only the public `EXPO_PUBLIC_API_URL=https://moniflow-api-silk.vercel.app` is embedded in the app. `EAS_NO_FROZEN_LOCKFILE=1` temporarily matches MONIFlow CI's existing `--no-frozen-lockfile` policy until we reconcile the root pnpm lockfile. Remove this workaround when the lock is regenerated and validated in frozen mode. It is not a secret.
- The browser-triggered workflow is `.github/workflows/eas-ios-simulator.yml`. It only accepts manually dispatched events on main and demands the exact approval `LINK_AND_BUILD_MONIFLOW_IOS_SIMULATOR`. Expo authentication uses a **GitHub Actions secret** `EXPO_TOKEN`. No secret is committed or logged.
- The workflow executes `eas init --account <owner> --non-interactive` from `apps/mobile`. Linking or creating the EAS project is a provider-side action performed **only when the owner clicks Run workflow**. It then requests exactly one EAS iOS Simulator build. No build automatically starts on code merges.
- Expo app linking writes `extra.eas.projectId` to `apps/mobile/app.json` in the temporary GitHub runner. The linked project ID is reported in the GitHub Actions job summary. **That file change is not persisted to main automatically.** After the first run, review the project ID, commit it to the repository via normal review, and use the same ID on subsequent builds; do not create duplicate Expo projects.
- Existing native BMONI signing requires secure on-device key ownership; cloud simulators are not proof of Secure Enclave / Keychain behavior, customer identity, KYC, managed CNGN wallet status or BMONI transfer settlement.
- The previously created synthetic BMONI sandbox account is public to the workflow logs. It MUST NOT be silently attached to a personal account, funded or used for personal documents. Existing API partner onboarding and authenticated demo flags remain disabled.

## What the Expo-account owner does (browser only)

1. Open [Expo personal access tokens](https://expo.dev/settings/access-tokens), sign in, choose **Create token**, name it for this GitHub MONIFlow simulator workflow, and copy it.
2. Open [MONIFlow GitHub Actions secrets](https://github.com/realxpen/moniflow/settings/secrets/actions), choose **New repository secret**, set **Name = EXPO_TOKEN** and paste the token as the value. **Never send the token to ChatGPT, include it in a screenshot, commit it, or place it in a GitHub workflow input.**
3. Open [MONIFlow iOS Simulator — Expo Cloud Build](https://github.com/realxpen/moniflow/actions/workflows/eas-ios-simulator.yml), choose **Run workflow** on branch **main**.
4. Enter your Expo **account owner username**, not your email, in `expo_owner`. If using a team/organization that owns the Expo project, enter that account's exact slug.
5. Enter exactly `LINK_AND_BUILD_MONIFLOW_IOS_SIMULATOR` in `approval` and run once.
6. GitHub runs typechecks and safety tests, links or creates the Expo project, reports the Expo project ID, and submits a **single** cloud build. Check its Actions log and your Expo project Builds tab; check whether it succeeds **before rerunning**.
7. Send only the **Expo project URL/ID** (public nonsecret) and build status to the assistant for a reviewed commit that persists project linking and for build-failure debugging. Do not send credentials, API keys or device signing data.

If a MONIFlow Expo project is already linked under another Expo owner, do not change or force-overwrite its project ID. Confirm project ownership before the first run. If initial linking fails because the chosen account lacks access, fix the Expo membership or existing Expo project association; don't repeatedly create projects.

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
