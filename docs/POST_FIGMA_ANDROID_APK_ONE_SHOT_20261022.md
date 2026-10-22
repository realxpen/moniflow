# One-Time Owner Approval — Post-Figma MONIFlow ARM64 Preview APK

Approval: REQUEST_ONE_MONIFLOW_POST_FIGMA_ANDROID_ARM64_APK_20261022

On 22 October 2026, the owner asked to proceed after squash-merging PR #60 and the prior release-readiness milestone. This ticket is scoped to **exactly ONE** new non-production ARM64 Android APK build using existing Expo project `@xpen/moniflow` and profile `android-apk`, once this ticket and its guarded workflow are merged into `main`.

Approved app source baseline: `d02c7887dd1c8f526e5cc6ebe8fa6bb9f32a8a04` (squash-merged PR #60, with green CI).

The workflow must verify that the preceding `main` SHA is exactly this approved baseline; the merge introduces **only the workflow, approval ticket, runbook, static test and CI test registration**. No app implementation, backend, payment flag, account configuration or secrets may change in that push.

The workflow will run complete source checks; verify unsigned private endpoints still reject access and BMONI financial feature flags remain disabled; confirm exact Expo project, package and BMONI native config; submit one `eas build --platform android --profile android-apk --non-interactive --wait --json` and record the Expo build ID. On successful Expo completion it will download the artifact transiently in GitHub Actions, inspect ZIP integrity and ARM64 React Native library presence, record a SHA-256 checksum, and publish **non-secret metadata only**. It will not install an APK or claim a working wallet.

Strict limits: no EAS submit, Google Play, App Store, user registration, live account linking, KYC, PIN/key collection, signing, transaction execution, financial recovery, provider payments, production API deploy, or transfer of funds. Do not reuse or rerun this ticket, even if EAS build fails or times out. Any fresh build requires fresh owner authorization.

The reviewer merges the PR to trigger the single job. This document is not itself proof of a finished build or device testing. Physical-device installation and screen-reader checks remain separately gated, as does financial activation.
