# B2 Consolidated Milestone — BMONI Identity Safety and Provider Evidence Readiness

Date: 2026-10-14
Status: **Sandbox-only / source-grounded / one consolidated review PR (#12)**

## Why B2 is one milestone instead of further small PRs

BMONI Embedded's public documentation establishes personal user/wallet and certain Nigeria-specific deposit/offramp mechanics, but does **not** independently prove merchant order-level collections, refundable escrow or third-party seller payout rights for Hustle. The signed MONIFlow partner `operation.received` event is likewise only command intake, not provider settlement. We can finish **local integration readiness** without a live provider credential, but may NOT fabricate a provider-side identity or success event.

This consolidated PR completes and tests the safety prerequisites that do **not** require BMONI's reply. Earlier merged PRs #8–#11 supply foundational webhook receipt verification, permanent identity conflict holds, atomic pre-dispatch reservations and keyed phone identity locks. PR #12 adds and validates:

1. **Key continuity / anti-rotation gate:** durable private marker, transactional first use, fail closed on changed/missing key, and never auto-bind an unmarked fingerprinted legacy database.
2. **Cross-database parity:** disposable PostgreSQL 16 CI job with real migrations, independent connections, race/unique-constraint tests, durable 409/manual-review holds, rotated-key refusal, BMONI-format fixture evidence insert/dedup/tamper failure.
3. **Read-only operator evidence:** `UserMappingRepository.inspectIdentityReadiness(expectedGuardDigest?)`, returning aggregate counts and key state only: `mappingCount`, `providerExistsHoldCount`, `unknownOutcomeHoldCount`, `fingerprintedHoldCount`, `legacyUnfingerprintedHoldCount` and `keyContinuity`. **No emails, phones, provider user IDs, digests, secrets or raw events** are returned. No mutations or provider calls.
4. **Real PostgreSQL webhook persistence fix:** preserve sub-second precision in `occurred_at` when comparing replay evidence. An authentic identical event must deduplicate; a changed digest at the same ID must be rejected.
5. **Negative tests:** repeated first-time creates and same-phone collisions, cross-user identity, 409 and timeout holds, process restart, legacy migration and unknown HMAC continuity, unrelated readiness key; all nonfinancial.

## Nonfinancial acceptance states

- `providerUserRecoveryConfirmed=false` and `providerFinancialExecutionAllowed=false` are **invariant** in the readiness report.
- `keyContinuity=MATCH` does not authorize BMONI access, KYC, merchant acquiring, custody, settlements or real money. It proves only that local phone reservations are checked with the same configured server key.
- `NOT_ENROLLED` with zero fingerprinted rows is an **empty or legacy-unfingerprinted DB diagnostic**, not automatic approval to create users.
- `UNMARKED_LEGACY`, `MISMATCH`, or `SECRET_NOT_CONFIGURED` are blocker states. Never force reset hashes, re-register provider users or rotate the secret to bypass them.
- A `PROVIDER_USER_EXISTS` or `PROVIDER_OUTCOME_UNKNOWN` hold requires manual/provider reconciliation. A hold is NOT a genuine `bmoniUserId`.
- The test-only BMONI webhook event fixture remains `TEST_OBSERVATION`. It **cannot** mark a Hustle Order paid, refund a payment, release escrow, move funds or confirm BMONI origin.

## CI release gates

- [ ] PR exact-head full MONIFlow verify CI: typecheck, mobile build, unit and fixture tests.
- [ ] PR exact-head **separate real PostgreSQL** job: identity holds, key continuity, unique fingerprints and webhook store parity.
- [ ] Dedicated Postgres job **must only access** local disposable `moniflow_b2_ci`, with `NODE_ENV=test` and `MONIFLOW_B2_DISPOSABLE_DB_TESTS=true`. All other DB names, remote hosts, providers and real credentials are refused.
- [ ] Postgres evidence records are digest-only and have `TEST_OBSERVATION` label; conflicts reject, duplicates dedup, timestamps preserve milliseconds.
- [ ] Readiness inspection is query-only and excludes PII, hashes and provider IDs.
- [ ] Code owner approves the *entire* B2 milestone in PR #12 after green CI. No auto-merge, deployment or provider activation.

## Remaining provider-dependent blockers (outside B2)

**Provider support:** Obtain BMONI written confirmation of an authorized existing-user lookup/recovery or reset path for the 409 sandbox case. Never infer the BMONI user ID from email, local UUID, provider error payload, source event reference or a shared sandbox identity.

**Commercial/legal:** Validate whether the exact Nigerian marketplace model supports distinct third-party service providers, Order-level collection, separately attributable financial event status, buyer refunds, provider payouts and lawful custody/escrow. If not, Hustle must choose an authorized financial partner that offers those capabilities.

**Provider evidence:** When genuine partner-specific sandbox credentials/rights are issued, use a separate, reviewed PR to capture read-only BMONI provider-origin evidence and correlate independently to an authorized Hustle operation; **do not advance financial state** merely because a signed event arrives.

**Product priority:** After B2 is green and approved, resume substantial Hustle MVP delivery (discovery/content → service consultation/booking → sandbox checkout/escrow UX), grouped into complete user-facing milestones rather than individual security-fix PRs.

## Source references

- Internal: `docs/BMONI_PARTNER_SANDBOX.md`, `docs/BMONI_B2_IDENTITY_RECOVERY_HOLD_GATE.md`, `docs/BMONI_B2_ATOMIC_REGISTRATION_GATE.md`, `docs/BMONI_B2_PHONE_IDENTITY_RESERVATION_GATE.md`, `docs/BMONI_B2_PHONE_KEY_CONTINUITY_GATE.md`, `docs/BMONI_WEBHOOK_EVIDENCE_FOUNDATION_B1.md`
- Public: https://embedded-docs.bmoni.com/api-reference/webhooks/ and https://embedded-docs.bmoni.com/api-reference/errors/
- Hustle: `Knowledge/QA/BMONI_HUSTLE_MERCHANT_RAILS_CAPABILITY_GATE.md`, `Knowledge/QA/MONIFLOW_PROVIDER_EVIDENCE_READINESS_GATE.md`

**No BMONI REST API or webhook subscription was invoked, no real bank/merchant account, custody, payment, refund or payout changed, and nothing was deployed to production by this milestone.**
