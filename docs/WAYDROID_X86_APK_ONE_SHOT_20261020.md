# One-time owner approval — MONIFlow Waydroid x86_64 UI-only APK

Approval: REQUEST_ONE_MONIFLOW_WAYDROID_X86_APK_BUILD_20261020

Date: 2026-10-20 (Nigeria time)

Owner's explicit instruction in MONIFlow ChatGPT conversation: "merged and squashed and approved for apk build" following PR #39 (https://github.com/realxpen/moniflow/pull/39), squash-merged to main as `9966a86a0575dc721d126a5a80556cc86da2e1ea`.

**Scope:** Submit exactly **one** Expo EAS Android APK build using profile `waydroid-x86-apk`, on the existing `xpen/moniflow` Expo project, after all read-only native preflight/identity safeguards pass. No app store submission; no additional EAS build, re-run, or workflow dispatch permitted under this ticket.

Preview package: `com.realxpen.moniflow.waydroid`. Native ABI: `x86_64`. BMONI Android native SDK omitted via Expo autolinking exclusion; native key/PIN/wallet/signing operations disabled, with non-read-only MONIFlow API requests blocked. Supabase login and owner-scoped workspace read-only features may be tested. Physical ARM64 package remains unchanged.

**One-time trigger:** The addition of this new ticket file on `main` is the unique allowed trigger for `.github/workflows/waydroid-x86-apk-once.yml`. Workflow must reject any invocation where the ticket existed at `github.event.before`, any attempt other than #1, missing `EXPO_TOKEN`, changes other than the ticket, wrong Expo identity, wrong ABI, linked BMONI signer, unsafe API flags or unsigned API access. An accepted EAS submission is not proof the APK has finished successfully.

**After submission:** Verify Expo status explicitly, download the actual finished APK from Expo, inspect `lib/x86_64/libreactnative.so`, and cold-start in Waydroid Android 13. Do not test real BMONI wallet creation, signing PINs, owner proof or money movement in this preview.

No changes to production API, financial permissions, database, Supabase settings, or Vercel deployment are authorized.
