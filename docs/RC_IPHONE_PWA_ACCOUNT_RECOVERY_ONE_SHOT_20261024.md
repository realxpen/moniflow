# One iPhone PWA Expo Hosting preview — Account isolation and uncertain-action recovery

Approval: ONE_EXPO_PWA_ACCOUNT_RECOVERY_UPDATE_20261024

**User request and evidence:** The founder personally verified that MONIFlow's iPhone PWA stays signed in, executes and persists the entire server-backed fictional ₦300k example, shows the ₦20k Laptop Pocket and two SIMULATED/NOT SETTLED activities after reopening, and that the tab bar safe-area fix works. Their next instruction was: “Yes it worked let move to next.”

**Pinned green application source:** `ca08f0a6202d55fa8cd154d820f52f2a91b4070f`, merged PR #88, all four CI jobs successful (including disposable PostgreSQL, authenticated real HTTP sandbox, native safety, TypeScript, Vitest, Expo web export). No app changes are made by this release PR.

This is a **single-use**, **web-only** Expo Hosting preview update of the existing `xpen/moniflow` app and `xpen-moniflow-pwa-202610` developer preview domain using the existing `mvp-preview` alias. `--environment preview` is mandatory; `--prod`, EAS Build, Apple/iPhone signing, Android APK, payment production rollout are not authorized. Its only new files are this ticket and `.github/workflows/iphone-pwa-account-recovery-once.yml`.

This release brings:
- Strong PWA response fencing against sign-out/account switch, even re-login to the same owner: user subject, auth intent revision, request sequence, screen owner, and owner of returned simulated state must all match.
- App-resume GET must not overtake an in-flight simulation POST.
- Network timeout or HTTP 5xx during a simulated action shows **SIMULATION OUTCOME UNKNOWN** and a **read-only state refresh**, rather than resubmitting the action automatically.
- No change to fictional balances, completed plans, real bank APIs or Supabase JWT validation.
- `EXPO_PUBLIC_MONIFLOW_PWA_PREVIEW=1` and the original strict sandbox-only browser write allowlist remain on. Public Supabase URL/key are client-only. No BMONI partner key, KYC, wallet signing, provider payments, Hustle escrow or real balances.
- The GitHub job checks its first and only introduction to `main`, exact parent source SHA, no other changed file, run attempt 1; it detaches to the approved source and verifies TypeScript, tests, web assets and signer exclusions before publishing **once**.
- A newly generated unique Expo Hosting URL may require extending **only** the isolated staging preview's exact browser CORS list and preview redeployment before iPhone access succeeds. Existing user sandbox ledger must not be reset.

**Acceptance:** after successful link and browser CORS verification, founder opens new preview in iPhone Safari, adds it to Home Screen, signs in and read-only refreshes existing ₦240k/₦20k/two-event simulation. If testing an interrupted connection, no POST is retried without an explicit subsequent read-only status reconciliation. Do not invent a cross-account device test; that still requires a separate disposable second account.
