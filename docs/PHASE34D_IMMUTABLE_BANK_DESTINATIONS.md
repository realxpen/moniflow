# Phase 34D — Immutable verified bank destination labels

**Date:** 2026-10-21

## Why this change matters

MONIFlow Money Plans use a human-facing saved-bank **label** when displaying and approving withdrawals. The plan hash commits to that label, but a separate bank registration endpoint previously permitted the same label to be overwritten by a new provider account ID via `ON CONFLICT ... DO UPDATE`. As a result, the approved label could silently point to a different beneficiary during later execution.

This milestone removes **silent substitution** from the trusted destination registry. It does **not** claim that a bank label alone is cryptographically bound to a specific external provider account: approving a provider-ID-level snapshot and verifying it again at execution remains a separate future design gate.

## Implementation

- A verified `(localUserId, normalizedLabel)` alias is **immutable**. The provider bank account ID, bank code/name, masked number and account holder cannot change under an existing alias. Use a new label to register a different beneficiary; obtain a fresh Money Plan and guard/approval review.
- Both SQLite and PostgreSQL bank repositories use insert-only `ON CONFLICT DO NOTHING` with a post-insert owner-scoped reload and exact comparison. Replaying an identical record is idempotent; a changed identity raises `BankDestinationLabelConflictError`. The databases' unique constraints make this race-resistant across concurrent registration requests.
- The bank `POST /api/banks/register` handler checks if an alias already exists **before calling BMONI verification or provider account registration** and returns HTTP 409. The repository also catches an alias conflict that appears after the preflight check and returns a stable 409 without updating a saved beneficiary.
- In-memory SQLite and Fastify regression tests cover idempotent replay, normalized alias conflicts, changed provider IDs and identity details, duplicate provider IDs under a second alias, tenant isolation, preventing provider calls for known aliases and a simulated concurrent change.

## Safety and limits

A concurrent provider registration can succeed remotely just before the local conflict is noticed; this code prevents the **local saved label** from changing, but does not claim to roll back the external provider registration. A provider-level orphaned registration would require an approved independent reconciliation flow. No production cleanup or mutation is performed here.

Direct database writes by privileged actors are outside this application-level guarantee. A future system should bind the human approval explicitly to the immutable provider beneficiary ID, include that binding in a signed plan authorization, and reverify it at execution time.

## Release gates

- Source-only review: TypeScript, Expo web export, Vitest and disposable PostgreSQL CI must pass.
- Source merge is not production deployment or a new Android APK.
- No live BMONI calls, bank identity/KYC data, saved destination edits, financial permissions, money movement, database migration, Vercel deployment or new EAS build are authorized by this milestone.
- Any future backend production deployment needs separate explicit permission and a deliberate compatibility check for workflows that previously relied on replacing an existing label. Those workflows must instead ask the user for a distinct label and a fresh Money Plan.

References: `apps/api/src/repositories/bank-account.ts`, `apps/api/src/routes/banking.ts`, `apps/api/src/services/plans/approval.ts`, `apps/api/src/routes/execution.ts`, `docs/PHASE34C_PLAN_APPROVAL_ORDER_INTEGRITY.md`.
