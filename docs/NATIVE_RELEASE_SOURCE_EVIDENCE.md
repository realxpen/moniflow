# MONIFlow native release evidence — source-only automation

**Phase:** Post-Figma v6 merge, 22 October 2026. This is a CI evidence gate, **not** authorization to build, deploy, sign, register a provider user, or move funds.

## What now runs automatically

Every pull request and push to main runs **Native readiness evidence (source-only, no build)**. It checks the versioned Expo project identity, normal Android APK configuration, separate Waydroid x86_64 read-only profile, BMONI signer exclusion for Waydroid, API mutation fence, and explicit one-time build authorization workflows. It also executes the existing static APK / Waydroid configuration tests.

The GitHub job emits a non-secret JSON artifact and a summary with the **exact source commit**. Green CI means only that these source configurations passed. It does not prove a native APK compiled or ran.

## What this does not do

- Request an Expo token, submit an EAS build, install an APK, deploy Vercel, or change financial flags.
- Claim that merged Figma UI exists on an installed phone or Waydroid machine.
- Perform VoiceOver/TalkBack, secure PIN entry, native signing or provider reconciliation.
- Confirm BMONI user ownership, KYC, payment, refunds or settlement.

The result always says HOLD_NATIVE_AND_PROVIDER_EVIDENCE. A successful static check never switches to release-ready.

## Next release gate

Use the GitHub Actions report for the exact candidate commit. A **separately owner-approved** build must be attached to that commit and have a finished, installable APK. One-shot tickets that were already used cannot be reused.

After approval, test a compatible physical ARM64 Android device. Waydroid x86_64 is for **UI-only** preview and cannot demonstrate the native BMONI signer. Record redacted evidence for cold start, VoiceOver/TalkBack, 100/150/200% text, small screens, owner switching, reconnection, and provider pending/failure states.

Financial provider checks remain a separate sandbox-only gate requiring real provider evidence and ownership. Production activation requires another explicit decision.

Related documents: docs/FIGMA_V6_A11Y_RELEASE_GATE.md, docs/PHASE33A_ANDROID_APK_RELEASE_PLAN.md, docs/WAYDROID_X86_UI_PREVIEW.md.

**No terminal required:** GitHub → Actions → MONIFlow CI → intended run → Native readiness evidence → job summary / moniflow-native-source-evidence artifact.
