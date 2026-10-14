# MONIFlow Phase 20 — Production readiness audit

Audit date: 2026-10-14. This is **read-only evidence plus GitHub code changes**; no production environment variable was modified and no Vercel release was started.

## Verified production and source baseline

| Check | Evidence | Assessment |
| --- | --- | --- |
| GitHub repository | realxpen/moniflow, main; Phase 19 CI #273 was green at ad08af0 | New Phase 20 commits require their own green CI |
| Stable Vercel website | moniflow-indol.vercel.app; most recent READY production deployment identified by Vercel is c8c264f | Earlier release, **not** latest Phase 19/20 |
| Stable Vercel API | moniflow-api-silk.vercel.app; most recent READY production deployment identified by Vercel is c8c264f | Earlier release |
| Vercel authentication protection | Disabled on both projects as reported by Vercel | API access relies on signed JWT route authorization; verify NODE_ENV=production on release |
| API production environment metadata | AUTH_AUDIENCE, AUTH_JWKS_URL, AUTH_ISSUER, CORS_ALLOWED_ORIGINS, DATABASE_URL, BMONI_BASE_URL and BMONI_API_KEY exist | Values and actual connections were **not** decrypted or printed |
| AUTHENTICATED_SANDBOX_DEMO_ENABLED | Absent from API project production env; defaults false in code | Safe disabled state |
| BMONI_PARTNER_ONBOARDING_ENABLED | Absent from API project production env; defaults false | Real partner registration remains intentionally blocked |
| Supabase MONIFlow project | rtcjismwbrvulccryyau; ACTIVE_HEALTHY; PostgreSQL 17, eu-west-1 | Project healthy, not proof that all private API queries succeed |
| moniflow_private schema | Existing BMONI mapping, money_plans, pockets, activities tables confirmed by read-only schema query | Existing financial structures remain in place |
| isolated_sandbox_demo_v1 | **Not yet present** in the connected Supabase project's moniflow_private schema | Expected while feature is disabled; must provision and verify on first authorized bootstrap |
| Private schema usage | anon, authenticated and service_role have no USAGE on moniflow_private | Positive direct-access isolation; API's private DB connection must be checked separately |
| API /health and /health/provider | Existing public URLs confirmed in earlier UI testing; automated external GET was not accessible from the audit tool | **Require direct live verification**; do not claim successful runtime authentication based on settings metadata |

## Bulk development changes

- **M1 — Release guard:** Server refuses to enable the authenticated sandbox unless NODE_ENV=production, DATABASE_URL points to Postgres and HTTPS same-origin JWT issuer/JWKS/audience settings are configured. Invalid settings produce field names, never secrets.
- **M2 — Account and interruption safeguards:** The authenticated sandbox screen clears stale account data after logout/sign-in, ignores responses for a previous account, prevents repeated double-tap mutations, and treats timed-out mutations as uncertain until a read-only refresh confirms state.
- **M3 — Feature availability:** Public provider health includes only authenticatedSandboxDemoEnabled boolean. Welcome shows the authenticated demo CTA only when the API advertises availability; the offline demo remains available while not released.
- **M4 — Release verification:** Health tests and this production audit define the approval gate for activation. Disposable PostgreSQL CI continues to test cross-instance row locking and ledger isolation.

## Activation blockers and release process — requires explicit owner approval

**Do not enable or deploy as part of the audit.**

1. Confirm the production API's /health reports environment=production and that the stable API endpoint is reachable from the stable web origin.
2. Confirm the production DATABASE_URL is durable PostgreSQL (never display its value). Confirm Auth settings point to the intended Supabase project and asymmetric signing key. Existing deploy settings alone are not proof of effective runtime mode.
3. After review and **explicit approval**, set **only the API project's** server-side AUTHENTICATED_SANDBOX_DEMO_ENABLED=true. Keep FINANCIAL_PROVIDER and BMONI_PARTNER_ONBOARDING_ENABLED unchanged.
4. Start a deliberate GitHub Actions Deploy MONIFlow to Vercel workflow on main, target both; confirm both production deployments are READY and share the intended commit SHA.
5. Use a disposable, non-personal Supabase test account. Confirm /api/sandbox-demo/status returns SANDBOX_NOT_STARTED, then bootstrap to the only permitted ₦300,000 simulated opening state.
6. Build the fixed canonical command, check eight MONI Guard checks, approve the stored fingerprint, explicitly simulate, and verify ₦260,000 illustrative provider balance, ₦20,000 internal allocation, ₦240,000 illustrative spendable, and **exactly two simulated activity entries**.
7. Refresh before and after approval, call simulate again, log out and sign back in, and confirm the exact same persisted result. Check a second test account sees no first account state; reset only the intended account.
8. Ensure BMONI /api/onboarding/user remains unavailable for shared-key partner registration, and real BMONI wallets, Pockets, Activity and transactions have not been touched.

If any step fails, mark the release blocked. A failing request must not be blindly resubmitted; read current state first. We have **not** performed these live tests.

## Rollback plan

If the production sandbox fails, set AUTHENTICATED_SANDBOX_DEMO_ENABLED=false in the API project's production environment and **manually deploy API**. This disables the new namespace without dropping or editing the isolated database ledger. The UI will hide the feature entry point after the API reports the flag off. Do not reset real financial data, switch NODE_ENV to development or use the shared BMONI key to bypass onboarding.

## Known non-goals

- No live BMONI transfer or partner enrollment; provider onboarding is pending dedicated access.
- No arbitrary financial instruction execution: the authenticated sandbox accepts **only** the canonical example.
- The sandbox persists its own JSONB simulated ledger, not the production money plan / Pockets / Activity records. A truthful demo must not call those simulated entries actual settled transfers.


## Approved production release attempt — 2026-10-14

**Approval:** Owner authorized enabling the isolated authenticated financial sandbox and deploying both applications.

**Release verification:** The temporary approval-scoped GitHub Action verified TypeScript, Expo web export and automated tests. The API Vercel local build completed successfully.

**Publishing result:** FAILED due exclusively to the Vercel Hobby deployment quota:
`Resource is limited - try again in 24 hours (more than 100, code: "api-deployments-free-per-day")`.
The API publish step was rejected; the web deploy step was skipped. No new production API or website version was published.

**Verified rollback/cleanup:** API production `AUTHENTICATED_SANDBOX_DEMO_ENABLED` was changed back to `false` and read back as disabled. `BMONI_PARTNER_ONBOARDING_ENABLED` remains unset/default false. The one-time approval workflow and its signal file were deleted; only the existing manual `.github/workflows/deploy-vercel.yml` remains for release. The last READY API deploy still reports previous SHA `c8c264f72a3afd8161a35dd45bfae697147e7f47`.

**Retry, only after quota resets:** Recheck all Phase 20 release gates and re-enable the API-only production feature flag, then run the existing **manual** GitHub Actions Deploy MONIFlow to Vercel workflow with `main` and `both`. Deploy API before web. If the API build or publication fails, reset the server-side flag to false and do not claim the authenticated sandbox is live. Wait for Vercel's quota window; do not retry while the same rate limit is active. Real BMONI user registration must remain locked.

**Outstanding:** No successful authenticated sandbox production smoke test has occurred. No user credentials or real funds were used during this attempt.
