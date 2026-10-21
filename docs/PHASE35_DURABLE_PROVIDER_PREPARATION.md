# Phase 35 — Durable provider-proposal preparation and no-auto-retry recovery

**Date:** 2026-10-21  
**Scope:** A coordinated, source-only backend milestone covering SQLite and PostgreSQL repository schema, Fastify preparation routes, read-only recovery visibility, cross-connection concurrency, crash scenarios, and disposable PostgreSQL integration CI.

## Fixed hazard

MONIFlow previously checked whether a provider execution existed, then called `offrampNigeria`, and only afterwards persisted the proposal. Two concurrent requests handled by separate workers could both see no execution and submit **two distinct provider proposals**. A crash after provider submission but before the DB write made a blind retry equally unsafe.

The prior Phase 34 consolidation deliberately blocked real BMONI execution. That **hard release gate stays in force**. This milestone builds the durable preparation protocol in source and validates it against a local simulated provider.

## End-to-end behavior

1. The owner-scoped execution preparation route validates an already human-approved plan, one withdrawal, the owner-bound verified bank ID, wallet mapping, and a fresh provider balance.
2. **Before any `offrampNigeria` request**, it atomically inserts `provider_preparation_holds_v1` with `plan_id` as the database primary key. The reservation snapshots local user, approved plan digest, verified bank provider ID and amount, and starts at `RESERVED`.
3. Concurrent callers or retries cannot acquire a second hold, even across app instances. If a valid execution record already exists, the route may show the existing proposal; it never creates another.
4. A successful provider response with a proposal ID is written to the provider-executions table; the hold changes to `PROPOSAL_RECORDED`. An exception, invalid/no proposal ID, or database write failure marks `PROVIDER_OUTCOME_UNKNOWN` when possible.
5. **A crash before either update leaves `RESERVED`, which also cannot be replayed.** No TTL lease expiry, automatic release, background retry, rollback claim or compensating payment attempt exists.
6. A separate owner-scoped `GET /api/operator/plans/:planId/execution/preparation?localUserId=...` reads the hold, reports state, timestamps, `automaticRetryAllowed:false` and `requiresManualReconciliation`. It performs **no provider call**, reveals no bank identity/transaction signing material, and is accessible even while the real BMONI mutation release gate remains disabled.
7. A genuinely missing hold returns 404. An ambiguous preparation returns 409 `PROVIDER_PREPARATION_ALREADY_CLAIMED`; missing provider proposal ID returns 502 `PROVIDER_OUTCOME_UNKNOWN`. These are manual reconciliation paths, not proof that a transfer completed.

## Additional PostgreSQL compatibility fix

The new real-PostgreSQL integration tests exposed a previously untested issue in the Money Plan repository: `intent_payload` and `plan_payload` could be stored as JSONB **string scalars**, rather than JSONB objects, causing Zod validation to fail when a persisted plan was loaded. The repository now uses PostgresJS `sql.json(...)` for typed JSONB writes, and reads both proper objects and legacy string-wrapped JSON (validated with the same strict schemas). Disposable PostgreSQL tests assert the newly written `jsonb_typeof(...)=object` and exercise old string-scalar compatibility. No existing stored values were rewritten or invented.

## Data compatibility

The SQLite and PostgreSQL repositories create a **new** private holds table via additive, idempotent schema initialization. Existing execution rows and historical activity are not deleted or modified. No secret, provider user or bank registration is changed. A new record may only be created once per `plan_id`; cross-user reads are filtered by both plan and authenticated owner.

**Important limitation:** Existing historical provider-execution records may predate this holds table. The route still checks that existing execution first; the existence of a historical execution must never be construed as a new hold.

## Automated acceptance

- TypeScript, Expo web export, all Vitest tests and prior disposable PostgreSQL CI.
- SQLite: independently opened connections to the same on-disk database, process restart, sticky unknowns, owner isolation, unrelated plans.
- Fastify with isolated mock provider: concurrent simultaneous preparation attempts, exactly one provider call, same-plan reuse, invalid provider response, exception, owner-scoped read-only state.
- PostgreSQL: **two actual SQL clients** against the CI-owned localhost `moniflow_b2_ci` database. The CI workflow explicitly runs the test and verifies one winner, cross-client unknown outcome visibility, and foreign-user read isolation.
- No external BMONI calls or real financial transactions. Release gate on real provider prepare/sign/finalize remains unchanged.

## Remaining requirements before any BMONI financial release

Durable reservation prevents a **second proposal for the same plan**, but does not prove the fate of a proposal after an unknown response. Do not automatically unlock or retry that plan. A partner-authorized provider proposal search/reconciliation protocol, human operations process, physical supported wallet-owner signing proof, verified KYC, verified balance/beneficiary access and explicit production permission are still required. Spending the same funds through **different plans** is a separate balance-reservation problem that is not solved here; real monetary execution remains off.

**This batch authorizes neither Vercel deployment nor Expo/EAS Android builds.** Source merge and native acceptance are separate.
