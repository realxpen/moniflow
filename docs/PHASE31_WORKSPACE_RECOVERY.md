# Phase 31 — Workspace reliability and traceable failures (2026-10-19)

## Why this phase exists

In Phase 30 the owner reached authenticated Home on Appetize but `GET /api/workspace/overview` returned HTTP 503. PR #33 introduced awaitable repository readiness and private allowlisted database failure categories. The latest API deployment at commit `9e55f61` is READY, **but no fresh authenticated workspace request is verified since that deployment**. Vercel Hobby retains too little historical log data to recover the old error category; the original cause is therefore still unknown.

## Safe improvement included in this milestone

- Every authenticated workspace storage failure produces an opaque, random UUID `reference` in the fail-closed 503 response. The same reference appears in the private log record alongside only a safe `stage` and allowlisted `kind`.
- The iOS client accepts and displays `Support reference: <uuid>` only when the server returns its known `WORKSPACE_READ_UNAVAILABLE` error shape and a valid version-4 UUID. Any malformed body, unexpected status or embedded raw error is ignored, leaving generic error wording.
- Normal 200 `not_linked` and `not_created` responses remain unchanged. Authenticated ownership checks, cross-account denial and account-switch invalidation remain unchanged.
- No BMONI provider call, financial read, wallet provisioning, KYC action, balance, activity, private data logging, migration, RLS grant or environment-variable edit is added.

## Acceptance checklist

1. PR CI green: API/mobile Vitest, Node source security guard, typecheck, Expo export and existing disposable database suite.
2. Review and merge through ordinary GitHub process. Do not assume a merge deploys the API or updates Appetize.
3. Deploy API separately and verify health + unsigned `GET /api/auth/session` and `GET /api/workspace/overview` still return 401.
4. Refresh the existing Phase 30 build after API release. A 200 response with `Not linked` confirms local account-readiness lookup. A 503 means **do not proceed** to BMONI account linking: use the private Vercel `workspace_storage_read_failed` stage/kind for immediate diagnosis. The new support reference appears on iOS only **after a separate new simulator build and Appetize upload**.
5. Do not claim the database error fixed, a provider identity linked, or any financial activity available without the corresponding independent runtime proof.

## Subsequent milestones, in dependency order

- **Phase 32:** Private BMONI subject-to-user reconciliation. Resolve public test fixture conflicts privately; require evidence for account ownership and uniqueness, explicitly no automatic pairing, no provider create/retry while unresolved.
- **Phase 33:** Device wallet proof on supported native hardware. Keep owner EIP-191 challenge proof distinct from transaction-hash signing, use partner-approved sandbox and avoid putting sensitive identity/PIN/private-key data in Appetize.
- **Phase 34:** Provider-backed read-only financial overview, after subject mapping, verified wallet ownership, approved KYC/rail and read authorization; no synthetic balances.
- **Phase 35:** Connect deterministic intent → Money Plan → MONI Guard → human approval → verified sandbox execution, with provider-derived transaction results; no production-money movements.

No Phase 32–35 provider-facing or money-moving operation is authorized by this Phase 31 PR.
