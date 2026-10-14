# Phase 20 — read-only production release verification

**Release state (14 October 2026): blocked by Vercel Hobby daily deployment quota.**

This runbook covers the isolated authenticated sandbox demo only. It never enables BMONI partner registration, processes payments or converts simulated records into real financial transactions.

## Bulk milestones and evidence

1. **Code verification:** Confirm the exact release commit has green `MONIFlow CI`, including TypeScript, Expo web export, Vitest and disposable PostgreSQL identity/sandbox ledger tests.
2. **Infrastructure audit:** Verify the intended Vercel projects are `moniflow-api` and `moniflow`; `AUTH_ISSUER`, `AUTH_JWKS_URL`, `AUTH_AUDIENCE` and durable `DATABASE_URL` are configured for the API. Do not print secret values.
3. **Quota gate:** Before any deployment, verify the prior Hobby quota restriction has expired or Vercel explicitly confirms publication is available. Do not repeatedly send production deployments to test the quota.
4. **Controlled publication:** With new owner authorization and green CI, set only the API's server-only `AUTHENTICATED_SANDBOX_DEMO_ENABLED=true`. Keep BMONI partner registration disabled. Dispatch the existing manual `Deploy MONIFlow to Vercel` GitHub workflow on `main`, component `both` (API then web). Require both deployments to become READY at the same intended commit.
5. **Public smoke gate:** After publication, run `pnpm smoke:phase20`. This issues **GET requests only** to:
   - `https://moniflow-api-silk.vercel.app/health`: HTTP 200, production environment.
   - `https://moniflow-api-silk.vercel.app/health/provider`: HTTP 200, partner registration off, authenticated demo advertised.
   - `https://moniflow-api-silk.vercel.app/api/sandbox-demo/status`: unauthenticated HTTP 401 `AUTH_REQUIRED`.
   - `https://moniflow-indol.vercel.app/demo/live`: HTTP 200.
   The script returns non-zero on any missing, unavailable or mismatched public gate. It never supplies sessions, touches balances or makes POST requests.
6. **Authenticated end-to-end verification (manual, disposable identities only):** With two non-personal test accounts, confirm account A starts at `SANDBOX_NOT_STARTED`, bootstraps to ₦300,000, submits **only** the canonical command, sees eight MONI Guard checks, explicitly approves the exact plan hash, then executes simulation. Expected: simulated provider balance ₦260,000, internal Laptop allocation ₦20,000, available/unallocated ₦240,000 and exactly two simulated activity entries. Test refresh, repeated execute (no duplicate), sign-out/in recovery, second-account isolation and owner-only reset. No real bank verification or provider settlement occurs.
7. **Closeout:** Record stable production URLs, precise deployed SHA, GitHub workflow and smoke result; review server logs for unexpected errors; verify that normal BMONI private wallet, activity, Pockets and onboarding data were not changed by sandbox operations.

## Failure and rollback

If quota is still exhausted, **do not enable the feature flag and do not trigger a deployment**. Preserve the previous READY production release. CI success is not production readiness.

If API publication fails after the flag is enabled, set it back to false immediately. If the new API is already deployed and fails a public or authenticated gate, disable the flag and deliberately redeploy the API; do not remove or reset the isolated sandbox table as a substitute for rollback. The website may display an entry point only when the backend advertises the demo. Never retry uncertain financial mutations blindly; read persisted state first.

**Scope:** Public smoke does not prove Supabase session continuity, user isolation or the correctness of any authenticated money plan. These require the manual checks above. The quota failure on 14 October 2026 left these checks outstanding.

## Development verification

`pnpm test` includes offline Node-based tests for the public release probe. Run `pnpm smoke:phase20` **only after** both apps are published and the feature is intentionally enabled. It is expected to fail safely before publication.
