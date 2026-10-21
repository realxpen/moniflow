# MONIFlow consolidated financial safety batch — provider beneficiary, money data, execution

**Date:** 2026-10-21
**Scope:** One coordinated backend hardening change spanning plan creation, identity binding, MONI Guard, human authorization, execution preparation, device-signature submission, provider completion, tests, and release gates. This replaces multiple small follow-up PRs with one independently reviewable phase.

## Completed in this batch

1. **Beneficiary ID bound to Money Plan:** verified bank destination details (`providerAccountId`, `bankCode`, `bankName`, masked account number and account-holder name) are snapshotted into the withdrawal action at `POST /api/operator/plan` using the authenticated user's saved, verified bank record. They are included in the plan's SHA-256 human-approval fingerprint. An unregistered or legacy/unbound withdrawal may still be represented as a blocked draft but **cannot** pass a later money-execution gate.
2. **No automatic rebinding:** MONI Guard, authorization preview, human approval, and execution-readiness all compare the immutable snapshot with the current owner-scoped verified destination. A missing, mismatched or modified binding fails with no financial authorization. The snapshot never changes just because a bank account label points somewhere different.
3. **Provider proposal and signature reconciliation:** execution preparation uses only the sealed bank identity; the server refuses device signature forwarding when the persisted provider proposal targets a different bank ID, amount or currency than the current reviewed plan.
4. **Provider completion before accounting:** finalization checks the approved plan hash, exactly one withdrawal, the verified beneficiary and the provider execution record **before** polling/marking completion, creating Financial Memory or allocating a Money Space. A mismatched account, amount, legacy plan or unapproved state cannot create a receipt or financial bookkeeping entry.
5. **Shared strict provider balance parser:** planning and execution preparation share one conservative CNGN available balance validator. No malformed comma grouping, exponent notation, ambiguous multiple CNGN records, negative or fractional sub-kobo amount is interpreted as spendable funds.
6. **Regression suites:** pure bank-binding tests, financial fingerprint mutation tests, complete guarded authorization tests, tampered execution signing/finalization scenarios, provider balance decoding tests and the existing PostgreSQL/SQLite suites.

7. **Release gate on actual financial routes:** Real BMONI execution preparation, device-signature forwarding and provider completion finalization are **hard-blocked with HTTP 503 / `BMONI_FINANCIAL_EXECUTION_NOT_RELEASED`** in development and production. Only isolated test injection and the explicitly simulated `moniflow-sandbox` provider can exercise these routes. This prevents any live BMONI monetary side effect before verified cross-instance idempotency, provider authorization and supported-device evidence. A new code review and explicit release decision are required to change this condition.

## Deliberate compatibility behavior

- The new `destinationBinding` field on bank-withdrawal actions is **optional in storage schema only** so older Money Plans remain decodable. Old plans with no seal **must be rebuilt and reapproved** before they can pass Guard, approval, execution or financial finalization. Existing approved hashes of canonical unbound legacy plans are not sufficient to move money.
- Non-moving balance/activity requests and allocations have no beneficiary snapshot; the separate authentication and provider gates remain unchanged.
- This avoids a table migration because persisted plans are already JSON payloads. The binding is owner-scoped, hashed and never supplied as a trusted client field.
- The bank registry was made immutable in PR #49. Provider-level validity remains an independent requirement; the app cannot certify bank ownership from a label or a locally computed hash.

## Explicit remaining release blockers

**No provider transaction has been performed.** This source-only batch does not grant access to BMONI partner identity, private test credentials, supported physical device owner signing, Nigerian KYC, verified live provider account balances, proof of provider account ownership or human financial execution permission.

**Important concurrency gate:** `execution/prepare` still calls provider offramp before its first durable local execution row is inserted. Two concurrent requests to separate API instances can therefore create duplicate provider proposals. Do not enable real provider withdrawals until a dedicated durable reservation/idempotency protocol, or explicit BMONI-supported request idempotency, is verified and tested with crash/retry scenarios. An in-process mutex is insufficient. Provider double-submission cannot safely be declared solved by these checks.

Do not infer successful native Android installation/compatibility from CI. The earlier Waydroid EAS one-time authorization was already consumed and is not reused.

## Review checklist

- TypeScript / web export / full Vitest / isolated PostgreSQL CI green.
- Under test, verified single withdrawal yields a reviewed beneficiary ID; legacy/mismatched seal blocks Guard, approval and readiness; tampered execution blocks signature forwarding and completion memory.
- Verify no provider call is made in unit/route tests and no production deployment, EAS build, BMONI operation, DB schema migration, secret modification or test-token request was triggered.
- Owner reviews this **one consolidated PR**. Production deployment, device signing, or real financial execution requires an independent explicit release decision after unresolved gates.
