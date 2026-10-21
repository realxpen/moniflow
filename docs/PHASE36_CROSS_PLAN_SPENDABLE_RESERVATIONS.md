# Phase 36 — Atomic cross-plan spendable capacity reservations

**Date:** 2026-10-21
**Delivery:** one integrated code-only backend milestone following merged Phase 35 PR #54.

## Goal

Multiple separately reviewed Money Plans must not concurrently commit the **same** CNGN spendable funds through two provider proposals. Phase 35 prevents duplicate proposals for one plan, but each plan previously assumed the same provider-balance snapshot and could create its own hold.

## End-to-end behavior

1. The server still verifies the plan is unchanged and approved, exactly one withdrawal, a verified provider beneficiary, the wallet mapping, and the fresh CNGN provider balance and allocated pockets.
2. The preparation route computes `reservedAmount = approved.plan.totals.totalCommitted` — **all** external movements **plus** internal Money Space allocations — with `spendableCeiling = providerBalance - alreadyAllocatedPockets`.
3. Before any provider call, the SQLite/PG execution repository atomically serializes spending claims for the **owner across all distinct plan IDs**.
   - **SQLite:** an actual `BEGIN IMMEDIATE` transaction serializes concurrent database connections and reads the current owner's already reserved commitments.
   - **PostgreSQL:** transaction-scoped advisory lock on the owner's ID serializes different workers/connections. The claimed hold and budget comparison happen within the same SQL transaction.
4. If `sum(existing reserved_amount) + new reserved_amount` is greater than the fresh spendable ceiling, return HTTP 409 `SPENDABLE_CAPACITY_RESERVED`. No new provider proposal, wallet signing, or account mutation occurs.
5. The per-plan unique hold still prevents repeat submissions. Distinct owners have separate spending envelopes and plan IDs are globally unique.
6. Amount comparisons use whole **kobo integer units** (hundredths of NGN). NaN, infinity, negative values, fractional kobo and invalid commitment totals fail closed.
7. Phase 35 holds created without a `reserved_amount` column value are **unknown budget** records. They block any new preparations for that owner (`UNRECONCILED_LEGACY_PREPARATION`) until a future separately approved manual reconciliation protocol is available.
8. Holds remain reserved in `RESERVED`, `PROVIDER_OUTCOME_UNKNOWN` and `PROPOSAL_RECORDED`. This is intentionally conservative: a provider response or timeout is not proof that spendable balance has been released. **No TTL-based auto-release or auto-retry** is added.

## Schema compatibility

Only one additive nullable `reserved_amount` field is added to the existing private `provider_preparation_holds_v1` table. SQLite checks `PRAGMA table_info` before altering an old table; PostgreSQL uses `ADD COLUMN IF NOT EXISTS`. Historical holds remain NULL (unknown budget); they are not guessed or backfilled. Existing user, bank, provider proposal, Money Plan and Financial Memory records are never rewritten by this work.

## Acceptance and limitations

- Full TypeScript, Expo web export, Vitest, and disposable localhost PostgreSQL CI.
- SQLite tests cover two independent connections on the same file racing over 100,000 NGN, restart behavior, kobo precision, independently scoped users, unknown legacy reservations and total-commitment validation.
- Disposable PostgreSQL CI uses two real database clients, unique per-test user identities and plans, checking cross-plan collision and unknown legacy reservations.
- Fastify route test creates two separately approved Money Plans for one user, then proves a withdrawal + pocket allocation cannot exceed the owner's envelope or trigger a second provider call.
- **No live BMONI financial execution is unlocked.** The existing `BMONI_FINANCIAL_EXECUTION_NOT_RELEASED` gate remains in place for prepare/sign/finalize with real BMONI credentials.
- Holds are **not automatically released**, even on provider-completed records. A future evidence-based reconciliation/release policy is essential before real financial operations. Counting unsettled reservations against a provider balance after the provider has already deducted funds may temporarily be too conservative; that is preferable to authorizing double-spending.
- A displayed approved plan is **not** a reserved payment. Reservations are created only during execution preparation. Plans can be drafted/reviewed concurrently, but only financially compatible ones proceed at the money-movement boundary.
- Multi-wallet/CNGN asset-specific reservations and provider-origin reconciliation remain separate design gates. Current private mapping is one managed CNGN wallet per owner.
- This PR authorizes **no** production deployment, EAS build, KYC update, test-token request, provider call or real money movement.

## Future requirements

Design a signed, provider-evidenced release process for terminal outcomes and spendable-balance snapshots (including partial settlement), demonstrate multi-instance crash/retry consistency, verify real BMONI partner credentials and physically supported wallet-owner proof, and obtain explicit financial release approval. Do **not** enable execution based solely on these tests.
