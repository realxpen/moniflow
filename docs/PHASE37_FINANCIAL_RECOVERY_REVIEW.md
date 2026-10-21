# Phase 37 — Financial Recovery Review (local evidence only)

**Date:** 2026-10-22  
**Delivery:** one complete read-only backend/mobile milestone: owner-scoped recovery inventory, local integrity classification, signed-in app screen, security and database integration tests.

## Why

Phase 35 created durable preparation holds before provider calls; Phase 36 prevents separate plans from oversubscribing the same CNGN balance. When a server crashes, or a proposal outcome is unclear, those holds must **remain locked** until an independently authorized provider reconciliation process establishes what actually happened.

Before this milestone, the API exposed a read-only per-plan preparation status but offered no owner-wide inventory or safe signed-in UI to distinguish historical, unknown, locally inconsistent or locally completed records.

## End-to-end implementation

1. Both SQLite and PostgreSQL execution repositories provide **owner-filtered newest-first lists** of durable preparation holds, including the nullable `reserved_amount` from Phase 36. Old records with unknown reservation amounts are never estimated.
2. A pure classifier compares each hold with the matching local Money Plan and local execution record, including reviewed hash, signed-off beneficiary ID, action amount, total committed amount, currency, provider proposal ID and owner ID.
3. All result states are truthful **local interpretations**:
   - `LEGACY_UNKNOWN_COMMITMENT`: pre-Phase36 reserve size not recorded
   - `LOCAL_RECORD_MISMATCH`: local plan/approval/destination/proposal/execution inconsistencies
   - `PROVIDER_OUTCOME_UNKNOWN`: provider request outcome cannot be established from local data
   - `PREPARATION_UNCONFIRMED`: a reservation exists, but no proposal outcome is locally confirmed
   - `LOCAL_PROPOSAL_RECORDED`: a matching local proposal entry exists; no provider settlement claim
   - `LOCAL_COMPLETION_RECORDED`: only local bookkeeping marks completion; provider proof was not checked in this workflow
4. New authenticated `GET /api/workspace/financial-recovery`: identifies the user **exclusively from the verified JWT**, rejects caller-supplied user IDs/query selectors, awaits database schema readiness, reads at most 26 owner-only holds and returns up to 25 redacted cases with `hasMore`. Response contains **no amounts, bank labels/account IDs, provider proposal IDs, holder names, email, balances, wallet keys, signatures, or secrets**.
5. An empty inventory means **no local hold records**; it never means no provider operations happened. All cases retain `manualReviewRequired:true`, `automaticRetryAllowed:false`, `automaticReleaseAllowed:false`, `providerEvidenceChecked:false` and `financialOperationsEnabled:false`.
6. Storage failures return HTTP 503 with an opaque support reference and allowlisted diagnostic category. No raw SQL or provider error is disclosed.
7. The authenticated Profile has a **Financial recovery · read-only review** navigation entry. The new screen shows only local case statuses and shortened plan references, never monetary amounts, execution controls or a request to BMONI.
8. The client refuses response flags claiming settlement or enabled money movement, checks the active authenticated session before and after network access, and hides prior account data immediately on account switch.

## Verification

- TypeScript + Expo mobile web export + full Vitest suite.
- Isolated Fastify route tests: 401, forged/foreign selectors, cross-owner repository fault, read-only output, result cap, no-record semantics and sanitized 503.
- Pure classifier tests: matching plans, changed amounts/beneficiaries/hashes, missing proposals, legacy holds, provider-unknown and locally marked completion.
- Mobile validator tests reject forged account subjects, misleading financial permission flags, malformed cases and oversized payloads.
- Existing SQLite persisted-hold tests now check owner-scoped list isolation; disposable PostgreSQL CI checks the same across two independent database clients.

## Explicit limits — what this does NOT do

- **No BMONI API request** or external transaction lookup is performed here. `providerEvidenceChecked=false` is permanent in this response contract.
- No manual or automated release endpoint, expiration, retry, rollback or provider reconciliation override is added.
- No proof of account ownership, device signing, KYC, wallet eligibility or historical financial settlement is obtained.
- No production Vercel deployment, Android APK/EAS build, real money transfer or database destructive migration is authorized. Live BMONI prepare/sign/finalize remain hard-disabled.
- The source code is not an administrative release process. Future manual reconciliation must have separately verified partner evidence, independent operators, auditable release authorization, and nonduplicative balance accounting before any reserve can be unlocked.

This review tool makes unresolved obligations visible without making them executable. Phase 37 is a **source-only development milestone**, not provider approval.
