# PR68 pinned-source Waydroid build — one-time review gate

Approval: REQUEST_ONE_MONIFLOW_PINNED_PR68_WAYDROID_X86_64_APK_20261022

## Existing authorization and reason for this correction

The owner approved and squash-merged [PR #68](https://github.com/realxpen/moniflow/pull/68) to request **one** internal Waydroid x86_64 UI-only preview built from `1d88ada4899e882b78491e3378d95bc397e9c067` (PR65 Android layout fixes plus PR67 login reliability). [Run #39778304111](https://github.com/realxpen/moniflow/actions/runs/39778304111) failed before Expo was invoked. Its `main` parent was `9245e6753271a127c41d794dd33fe4fe7e72d695`, reflecting [PR #69](https://github.com/realxpen/moniflow/pull/69) Nigeria KYC and payment-rail safety changes. **No APK was submitted in the PR68 attempt.**

This ticket does **not** expand the mobile source authorized for building. Rather than continually depend on which unrelated PRs merge before a build ticket, the new workflow **checks out the exact pinned source `1d88ada4899e882b78491e3378d95bc397e9c067` for all install, source validation and EAS build steps**. It builds from that snapshot even if `main` has newer unrelated changes. It records both the pinned build source SHA and the GitHub workflow trigger SHA. Do not claim that this APK contains backend PR69; PR69 changed API/docs only and the app's reviewed source is unchanged.

## Boundaries and activation

Squash-merging the reviewed PR containing this new ticket **confirms one build from the same previously approved, explicit pinned source**. The trigger checks that the first-use ticket is new, previous `main` commit is an ancestor of the triggering merge and that the merge introduces **exactly** the new workflow, this ticket, QA document, static test and CI registration file. The job runs only once on the first push; do not rerun on success or failure.

The pinned source uses existing Expo project `@xpen/moniflow`, package `com.realxpen.moniflow.waydroid`, profile `waydroid-x86-apk`, with BMONI native wallet signing excluded and financial API writes disabled. Before EAS it checks TypeScript, Vitest, Expo web export, x86 native autolinking and Gradle, plus live signed-out API protection and disabled BMONI sandbox financial flags. It submits **one** EAS Android x86_64 build, waits for a genuine FINISHED result and verifies APK ZIP integrity, x86_64 React Native library, absence of ARM native libraries and SHA-256. Only non-secret evidence is uploaded.

No new application or backend edits, no phone ARM64 or iOS build, no store release, no provider onboarding, KYC submission, PIN/key handling, real money, wallet or financial API mutation. A separate approval is required for any future APK or production/financial activation.

This PR is an **owner review point**; the user must approve the pinned-source approach and squash-merge before any EAS submission. Old tickets must not be re-run.
