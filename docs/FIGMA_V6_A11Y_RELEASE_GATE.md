# MONIFlow v6 — Accessibility and release-readiness gate

**Scope:** React Native presentation and QA, following squash-merged Figma v5 PR #57. No release is approved by this document.

## Changes

- VoiceOver / TalkBack-readable labels for financial approval, status pills, MONI Guard rules, review stages and provider progress.
- Approval button conveys that it records the exact reviewed plan but does **not** send money. It has an explicit disabled accessibility state and doesn't vibrate if disabled.
- Device signing PIN has a secure text-field label without displaying or logging the PIN.
- Provider processing failure is **FAILED**, never **DONE**; an unknown result is described as unavailable, not confirmed processing.
- Existing server-side approval fingerprint, device signer, provider status, financial finalization and reconciliation remain authoritative.

## Automated gate

GitHub CI must pass TypeScript, Expo web export, Vitest tests and disposable PostgreSQL identity / ledger checks. These checks validate code, not the actual native accessibility tree or payment infrastructure.

## Required native and service QA before any release

1. Verify the installed Android/iOS binary's source SHA, backend target and sandbox configuration.
2. Test VoiceOver and TalkBack focus/reading order through interpretation, Money Plan, MONI Guard, approval, signing and result.
3. Check system text sizes 100%, 150% and 200%, small-screen scrolling, keyboard avoidance and no clipped touch targets.
4. Confirm Reduce Motion behavior with animated status components.
5. Ensure **REVIEW**, **BLOCK** and **FAILED** cannot be mistaken for financial success.
6. Verify approval does not automatically sign or submit, changed amount/destination invalidates approval, and device PIN/private key remains local.
7. Background/resume, session switching, network loss, provider delay and unknown-state reconciliation must not expose an old owner's state.
8. A supported sandbox provider test must prove actual provider status and ledger evidence; UI demo examples or green CI are not proof of BMONI completion.
9. Inspect all manual-recovery states: no automatic retry, fund release or linking from an informational screen.
10. Require a separate, explicit go/no-go decision before any new APK, production credentials, deployment or real financial movement.

## Status

This is a review branch. No new APK was built, no native screen reader was operated, no BMONI transfer was performed and no deployment was triggered.

Design reference: https://www.figma.com/design/Ir1EG2ui7qVhVuSrYoU917
