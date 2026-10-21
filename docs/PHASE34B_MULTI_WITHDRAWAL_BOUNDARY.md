# Phase 34B preflight — Multi-withdrawal authorization boundary

Date: 2026-10-21

## Problem

MONIFlow's Money Plan can contain multiple `BANK_WITHDRAWAL` actions. The API's server-side MONI Guard and the human-approval/readiness routes historically looked up only the **first withdrawal**. Because the server overlays a verified beneficiary result onto the overall DESTINATION rule, a plan containing a verified first withdrawal and an unverified second withdrawal could incorrectly receive a DESTINATION pass. The execution engine independently supports **exactly one bank withdrawal** and would reject multiple, so approval/readiness must not claim otherwise.

## Fix — no partial verification

- At `POST /api/operator/plans/:planId/guard`, plans with multiple bank withdrawals fail the DESTINATION check with critical severity and an explicit explanation. No first-only beneficiary lookup or apparent approval.
- Plans with exactly one withdrawal still require a saved, independently verified beneficiary belonging to the same `localUserId`.
- `GET /api/operator/plans/:planId/authorization` now refuses anything other than exactly one withdrawal.
- `POST /api/operator/plans/:planId/approve` refuses multiple withdrawals, including previously persisted legacy review records.
- `GET /api/operator/plans/:planId/execution-readiness` refuses anything other than exactly one withdrawal, returning `canExecute:false` and `UNSUPPORTED_WITHDRAWAL_COUNT`.
- Existing `execution/prepare` already enforces exactly one withdrawal. This PR aligns earlier authorization checkpoints with that pre-existing execution constraint.
- Isolated in-memory SQLite route tests validate first-only verification, two independently verified beneficiaries, forbidden legacy human approval, forbidden legacy execution-readiness, supported single-beneficiary review, and missing single-beneficiary blocking.

## Scope and explicit release gates

No live BMONI account, destination, wallet, KYC, provider balance, signing request, money movement, or database schema is changed by this source-only fix. Existing production provider and financial permissions remain disabled. Do not deploy this code to a production API or build new Android APKs without independent owner approval.

The current policy intentionally refuses multi-withdrawal execution **even when both beneficiaries are verified**. Supporting multiple external proposals properly requires a separate end-to-end product specification, distinct signed approval per action, idempotency design, provider failure/partial-completion handling, and independent approval. The safe immediate choice is to ask the user to split those into separately reviewed Money Plans.

## Acceptance

1. TypeScript, Expo web bundle export, Vitest and disposable PostgreSQL CI must pass.
2. Review both the existing `@moniflow/moniguard` rule and the server-side verified-beneficiary overlay; neither may claim an unsupported multi-withdrawal plan is ready.
3. Owner reviews and squash-merges the PR separately. No production deploy, EAS build, webhook/provider call or financial execution is authorized.
4. Before a future authorized backend deployment, retest this guard and approval flow in a safe isolated environment.
