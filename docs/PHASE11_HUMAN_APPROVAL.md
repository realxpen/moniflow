# Phase 11 — Human Approval

## Goal

No financial execution path may proceed unless the exact persisted Money Plan is explicitly approved by the user.

## Authoritative state machine

```text
VALIDATING
   ↓ MONI Guard REVIEW
AWAITING_USER_APPROVAL
   ↓ explicit user approval
APPROVED
```

A blocked plan becomes `BLOCKED`. A plan with no external financial movement may become `APPROVED` from MONI Guard `ALLOW` because no external human authorization is required.

## Server authority

The mobile app never authorizes a client-supplied plan object.

1. `POST /api/operator/plan` creates and persists the authoritative plan and returns `planId` + `planHash`.
2. `POST /api/operator/plans/:planId/guard` reloads the stored intent/plan and persists MONI Guard results.
3. `GET /api/operator/plans/:planId/authorization` returns the server authorization snapshot.
4. `POST /api/operator/plans/:planId/approve` records explicit approval only when the plan is `AWAITING_USER_APPROVAL` and the expected fingerprint still matches.
5. `GET /api/operator/plans/:planId/execution-readiness` is the Phase 11 read-only checkpoint.
6. Phase 12 must call `requireApprovedPlanForExecution()` before creating any BMONI proposal.

The legacy `/api/operator/guard` route remains a non-authoritative Phase 10 preview. It cannot change approval state and cannot authorize execution.

## Approval fingerprint

MONIFlow binds approval to a SHA-256 fingerprint of the execution-sensitive Money Plan snapshot, including:

- currency
- current available balance captured by the plan
- ordered actions
- action kind
- action label/destination
- action amount
- movement type
- approval requirement
- plan totals
- source intent

The approved fingerprint is stored separately as `approved_plan_hash`.

## Mutation rule

If the plan fingerprint changes after approval, approval is immediately invalid.

The server clears:

- `approved_plan_hash`
- `approved_at`
- Guard authorization state

and returns the plan to `VALIDATING`. MONI Guard must run again before the changed plan can be approved again.

This is stricter than simply returning to the approval screen and prevents an edit-after-Guard bypass.

## Execution gate

`requireApprovedPlanForExecution()` rejects unless all are true:

- plan exists for the requesting local user
- status is `APPROVED`
- `approved_plan_hash` exists
- `approved_plan_hash` equals the current plan fingerprint
- the last MONI Guard `plan_hash` equals the current plan fingerprint

Phase 12 must call this function immediately before any BMONI proposal-creation path.

## Mobile authorization UI

The authorization screen loads by `planId`; it does not trust serialized navigation plan data.

It displays:

- `AUTHORIZE`
- exact external amount
- bank destination label
- warning that the action moves money outside MONIFlow
- expected available balance after the full plan
- explicit `Approve ₦…` button

Verified account mask and account-holder name are shown only when they are backed by a real saved/verified bank destination. Phase 11 deliberately does not fabricate `•••• 8241` or a customer name.

## Boundaries

Approval does not:

- create a BMONI proposal
- request a BMONI signing payload
- sign a transaction hash
- submit money movement
- claim transaction success

Those remain Phase 12+ responsibilities.

## Tests

`apps/api/src/services/plans/approval.test.ts` proves:

- an awaiting plan cannot pass the execution gate
- explicit approval transitions to `APPROVED`
- an unchanged approved plan passes the gate
- amount mutation invalidates approval
- destination mutation invalidates approval
- stale approval hashes are rejected and require Guard revalidation
