# Phase 27 — Check whether browser-hosted EAS Simulator is available

Date: 2026-10-16. Expo project: [@xpen/moniflow](https://expo.dev/accounts/xpen/projects/moniflow), ID `3d986249-f72b-494b-9ceb-eef8335a5ae0`.

**Confirmed:** Expo finished MONIFlow's first standalone iOS Simulator build `aee7b52f-2ae1-431a-9e02-bef7d012ebd4` with **Succeeded**, SDK 57 and app version 0.1.0, as evidenced by the owner's authenticated build screen. Expo's GitHub workflow linked and submitted this specific build successfully. This is a real native iOS Simulator build, but not a device-signed iPhone IPA.

## Why test availability before starting?

Expo's EAS Simulator service offers a cloud-hosted virtual iPhone accessible in a browser, so Linux doesn't need Xcode. However, Expo says the service is **limited-access**, experimental, and sessions can count against account pricing/quotas. The documented read-only command `eas simulator:availability --json` checks if this Expo account has access without creating a session or incurring simulator runtime. See [Expo's EAS Simulator skill](https://github.com/expo/skills/blob/main/plugins/expo/skills/eas-simulator/SKILL.md).

## Owner's browser-only steps

1. GitHub Actions already has the valid `EXPO_TOKEN` **repository secret**, created by the owner for Phase 26. No new token needs to be shared or added.
2. Open [MONIFlow EAS Simulator Access — Cloud](https://github.com/realxpen/moniflow/actions/workflows/eas-simulator-access.yml) and use **Run workflow** on `main`. There are no inputs. Do this only when you want to check eligibility.
3. Check the resulting job summary for **AVAILABLE** or **NOT AVAILABLE**. It performs no build, user creation or remote simulator start.
4. If **AVAILABLE**, plan a separately confirmed, finite-duration browser simulator session using the existing successful iOS Simulator build ID. **Do not create sessions automatically**; they consume quota and may be billed. Prefer a short `web-preview-only` session with explicit duration and avoid printing preview URLs containing secrets in a public repo. A private route may be needed for access-controlled links.
5. If **NOT AVAILABLE**, open the existing EAS build page and use the **Download** artifact to upload the compressed `.app` simulator bundle to a separate browser-simulator provider such as [Appetize](https://appetize.io/upload), after reviewing that provider's account permissions, data exposure and pricing. This is a browser-hosted visualization of the native app, **not** BMONI wallet validation.

## Guardrails

- No `eas simulator:start`, build, provider API write, TestFlight, Apple signing, app store submission or paid cloud session runs during the eligibility check.
- The workflow prints only the boolean eligibility, Expo project link and test-build link to the job summary; never the access token.
- No BMONI KYC, native key ownership, real-person identity association, transfers, wallet balances or production access is established by simulator access.
- The first build succeeded at an earlier source SHA, not necessarily the latest merged GitHub commit. A later new build must be explicitly approved and independently verified.
- MONIFlow's public BMONI synthetic test-user fixture must not be associated with actual KYC or funds.
