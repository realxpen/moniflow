# MONIFlow PWA sign-in fix — One Expo Hosting Preview Update

Approval: ONE_EXPO_PWA_SANDBOX_LOGIN_PERSISTENCE_UPDATE_20261024

**User issue:** MONIFlow installed iPhone PWA signs in successfully, but loses login when the app is closed or reloaded. Requested fix is an in-place continuation of the approved PWA testing experience, not a new financial product.

- **Exact reviewed/merged application source:** `04b37350e4781eb79db45d857f5b7cb82930e693` (PR #82), which passed full TypeScript/Vitest, Expo web export, canonical sandbox HTTP and PostgreSQL security CI.
- This new preview publication uses the **existing** `xpen/moniflow` Expo Hosting project and `xpen-moniflow-pwa-202610` development domain / `mvp-preview` alias to update the **simulated-money testing web app only**.
- Reuses the verified one-time workflow protections: runs exactly once only when first introducing this ticket to `main`; source previous main HEAD must match the pinned commit; checked-out application files remain fixed to that SHA; reruns are rejected; only ticket and workflow may differ from the pinned app source.
- Rebuilds source with preview-only public Supabase Auth and sandbox API settings; tests app, backend safety and three installed PWA icons; publishes via `eas deploy --non-interactive --dev-domain xpen-moniflow-pwa-202610 --alias mvp-preview --environment preview --json` **without** `--prod`.
- MONIFlow now restores the sandbox PWA login from an HTTPS origin-bound, seven-day refresh credential using Supabase validation. Access tokens, passwords, simulated balances, and PII are not saved. Safari storage can be blocked; that falls back to ordinary sign-in. Explicit sign-out revokes remembered local credentials. A new Hosting URL may be needed if Expo assigns a new unique preview host.
- **Financial safety:** no BMONI/real-money API key, signing, KYC, bank transfer, actual ledger settlement, Hustle escrow authorization, native APK, Apple build, EAS Build, production promotion or provider operation is involved. Browser token persistence is limited to the simulated testing PWA; real financial sessions require a stronger HttpOnly-cookie or device-secure architecture.
- Acceptance is a successful Expo Hosting deployment link followed by on-device sign-in → close PWA → reopen → restored same account; wrong-user/expired/invalid credentials must not restore, and sign-out must stay signed-out. GitHub CI alone cannot prove iPhone WebKit's runtime behavior.
