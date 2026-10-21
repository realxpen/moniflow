# Phase 34C — Money Plan approval fingerprints preserve action order

**Date:** 2026-10-21

## Why

The persisted Money Plan approval fingerprint previously sorted actions by their numeric `index` before hashing. That meant a changed **array order** could produce the **same hash** if each action retained its previous index, label and amount. MONI Guard separately requires action indexes to be sequential in their **actual order**, but an already-approved plan can be consumed by later execution/readiness checks without running the Guard again. An approval must therefore bind to the exact action order shown to the user.

## Implementation

- In `services/plans/approval.ts`, `fingerprintMoneyPlan` now hashes `plan.actions` in its original order, without sorting. The hash still covers currency, available balance, exact action fields and original indexes, totals, human-approval requirement and source intent.
- With unchanged plans, this is deterministic. Reversing the same action objects **without reassigning indexes or changing amounts** now changes the fingerprint.
- The existing approval lifecycle detects a changed stored fingerprint: pending approvals fail with `PLAN_CHANGED`; previously approved plans are invalidated to `VALIDATING` and are not eligible for execution until MONI Guard is rerun and a new approval is obtained.
- Tests cover hash stability, order sensitivity, stale pending review, post-approval tampering, and critical MONI Guard rejection of action-order/index mismatch.

## Compatibility and rollout

**Hash behavior changes** when the stored `actions` array was previously in non-index order. These previously reviewable/approved records must be re-evaluated and reapproved, never silently grandfathered. Canonical stored plans produced by `buildMoneyPlan` are already in sequential order, so their existing hashes are unchanged.

This is a source-only backend security change. The production API was **not deployed**, and no provider balance, bank record, native wallet, PIN, KYC, BMONI proposal, financial transaction, database migration, Expo build or financial permission was touched. Do not enable real provider execution without the independent Phase 32–35 approval/identity/owner-proof gates.

## Acceptance

1. `pnpm typecheck`, Expo web export, `pnpm test` and disposable PostgreSQL CI must pass.
2. Review the new hash against valid canonical and malicious order-changed examples. Confirm a second approval is needed after a plan is modified.
3. Owner reviews and squash-merges the PR. Any production backend rollout requires separate explicit approval; merge does not deploy the API.
4. In any future authorized staging environment, exercise both an unchanged reviewed plan and a deliberately reordered legacy plan, verifying that only the unchanged plan remains approvable and execution requires a current valid approval.

References: `docs/PHASE34B_MULTI_WITHDRAWAL_BOUNDARY.md`, `apps/api/src/services/plans/approval.ts`, `packages/moniguard/src/rules/plan-integrity.ts`.
