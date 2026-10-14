# Phase 19 — authenticated, API-backed MONIFlow sandbox

## Milestone status

1. **Real engine (committed):** POST plan uses existing parseIntent, buildMoneyPlan, fingerprintMoneyPlan and evaluateMoniGuard. The real eight deterministic rules run on the canonical sample instruction. GTBank here is an illustrative saved-bank label, **not a verified bank account**.
2. **Isolated persistent records (committed):** Workspace per authenticated Supabase UUID in isolated_sandbox_demo_v1, with SQLite support for tests and a PostgreSQL moniflow_private table for production. Demo records have NO foreign-key references to BMONI users, BMONI wallets, real plans, Pockets, activities, or provider operations. No real balances, signing keys, BVNs, bank account numbers, BMONI IDs, or other real financial data are stored.
3. **Protected API (committed):** The production authorization hook verifies the JWT and provides request-scoped identity. The sandbox never takes a localUserId from the request; POST /bootstrap initializes a user at the fixed illustrated ₦300,000, once. GET /status is read-only. POST /plan idempotently saves a canonical example plan. POST /plans/:id/approve requires consent and the exact plan hash. POST /plans/:id/simulate applies the simulated debit and internal allocation under a database row lock. POST /reset requires an explicit opt-in phrase and resets **only** this user's simulated records.
4. **Client UX (committed):** /demo/live offers sign-in, bootstrap, plan review, human consent, explicit simulated execution, persisted example activity, status-only refresh, and explicit reset. /demo/operator remains a completely offline guided simulation.

## Simulated result

The fixed example starts at ₦300,000, subtracts a **hypothetical** ₦40,000 GTBank withdrawal, then allocates ₦20,000 internally to a Laptop Money Space. The resulting illustrated provider balance is ₦260,000 and available-to-spend is ₦240,000. Activity uses *simulated_external* and *simulated_internal* source labels, never provider-confirmed sources.

The sandbox never calls BMONI, never authorizes a real transfer, never uses a device signing key, and never writes to existing real money-plan, pocket, wallet, funding, Activity or execution repositories. A successful result confirms the sandbox application's own state transition, **not** BMONI settlement.

## Production activation and release

The server-only flag AUTHENTICATED_SANDBOX_DEMO_ENABLED defaults to false. When false, the /api/sandbox-demo namespace is not registered. Do not configure this in EXPO_PUBLIC_ variables.

Before manually deploying:
- Confirm the API runs with NODE_ENV=production, valid Supabase ES256/RS256 JWT issuer/JWKS settings, a restricted CORS allowlist, and a durable PostgreSQL DATABASE_URL.
- Explicitly set AUTHENTICATED_SANDBOX_DEMO_ENABLED=true **only on the API project** after review. Never set NODE_ENV=test or enable BMONI_PARTNER_ONBOARDING_ENABLED with the shared BMONI key.
- Run GitHub Actions Deploy MONIFlow to Vercel manually with main and both. A Vercel deployment alone does not prove the database migration or JWT boundary, so check runtime logs.
- Test login, /api/sandbox-demo/bootstrap (first and repeated), plan, Guard, rejection of unapproved execute, approve with correct hash, repeated simulate, refresh, logout/login recovery, separate account isolation and explicit reset. Confirm normal BMONI partner registration stays locked.
- If any PostgreSQL, auth or sandbox API error occurs, keep the feature disabled while investigating. Do not enable a development-mode API publicly.

## Known limitations

- This is a **canonical scripted scenario only**. General arbitrary financial instructions are not accepted by the sandbox endpoint.
- The simulated account uses a single atomic JSONB ledger record per authenticated user, not real Pockets/Activity tables. PostgreSQL row locks make each approval, simulation and reset serializable per user; the existing real-provider financial infrastructure remains separate.
- "Human approval" in this simulation acknowledges the illustration; it is not a banking signature, verified destination, or genuine external authorization.
- The user must explicitly initialize their workspace. A repeated bootstrap cannot refill balances; an explicit own-workspace reset is available for demos.
- Real partner BMONI KYC, user recovery, genuine wallet balances, CNGN proposal signing and execution remain blocked or unverified until dedicated access and real device support are available.

## Milestone 6: disposable PostgreSQL concurrency test

The CI disposable PostgreSQL 16 gate also runs a separate sandbox database integration test. Two independent database connections race to create the same plan and execute the same approved simulation; the expected single plan, two activity entries, 260k/20k/240k reconciliation and cross-user isolation must hold. The test only runs against the explicit 127.0.0.1:5432/moniflow_b2_ci disposable test database, never on production.

## Phase 20 startup safety gate

With AUTHENTICATED_SANDBOX_DEMO_ENABLED=true, the API now refuses to initialize this feature unless NODE_ENV=production, DATABASE_URL is PostgreSQL, and the Supabase JWT issuer/JWKS/audience settings are valid and HTTPS same-origin. The error reports only which configuration field is unsafe and **never logs secrets or the database URL**. The feature is disabled by default; this gate makes an accidental public SQLite or development-mode activation fail closed.

## Phase 20 release discovery

The public /health/provider document includes a boolean authenticatedSandboxDemoEnabled so the Welcome screen only promotes /demo/live after the API's server-only feature flag is enabled. This is read-only release metadata, not an authorization bypass: the /api/sandbox-demo routes continue to require an authenticated Supabase user. While the flag is false the Welcome screen explains that the feature has not been released and continues offering the offline demo.
