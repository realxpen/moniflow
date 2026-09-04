# MONIFlow Project State

## Current Phase

Phase 13 — Provider Submission & Verification

Phases 11–13 are implemented at the application/code boundary. The remaining blockers are live sandbox/provider verification and deployment environment verification, not missing execution architecture.

## Working in Code

- Phase 1 pnpm workspace, Expo Router mobile app, Fastify API, package boundaries
- Phase 2 visual system and reusable components
- Phase 3 shell/navigation
- Phase 4 BMONI REST client + user mapping
- Phase 5 native BMONI wallet + owner-proof flow
- Phase 6 Nigeria NGN KYC flow in provider-required order
- Phase 7 provider wallet/balance + NGN funding-account support
- Phase 8 deterministic Intent Engine
- Phase 9 provider-balance Money Plan
- Phase 10 deterministic MONI Guard
- Phase 11 persisted Human Approval state machine
- Phase 12 Nigerian withdrawal proposal + raw proposal-hash device signing
- Phase 13 provider signature submission + proposal polling/result

## Non-Negotiable Execution Boundary

No external financial movement may be initiated from client-generated plan data.

Every execution begins with:

`requireApprovedPlanForExecution(planRepository, planId, localUserId)`

It only accepts an explicitly approved, unchanged persisted plan whose approval fingerprint still matches the current stored Money Plan.

If amount, destination, action structure, totals, or another approval-sensitive field changes, approval is invalidated and the plan returns to validation/Guard before it can be approved again.

Before BMONI proposal creation MONIFlow also re-reads the provider-backed CNGN balance. A balance change invalidates the approved consequence snapshot and returns `BALANCE_CHANGED_REPLAN_REQUIRED`; no proposal is created.

## Nigeria NGN KYC Lifecycle

The current React Native integration follows the provider order:

1. Create BMONI user.
2. Create/recover device owner wallet.
3. Owner-proof challenge + EIP-191 `signMessage`.
4. Create managed CNGN wallet.
5. BVN lookup for sandbox-persona match.
6. PATCH Nigerian KYC profile.
7. Upload identification document.
8. Upload proof-of-address document.
9. GET `/kyc/readiness`.
10. POST `/kyc/activate` with `{}` for NGN; no `sumsubLevelName`.
11. POST `/onboarding/start-nigeria` using persisted CNGN wallet address/index.
12. GET onboarding status until BMONI reports the rail active/ready.
13. Read existing NGN deposit account or POST `/vba/ngn` with `{ smartWalletId }`.
14. Use BMONI account balances as the financial source of truth.

No biometric upload is used for the NGN flow.

KYC uploads accept only bounded JPEG/PNG multipart data in the MONIFlow API before being forwarded to BMONI.

## Nigerian Bank Destination

Implemented provider path:

1. `GET /bank-accounts/nigerian-banks`
2. `POST /bank-accounts/verify-nigerian-account`
3. Server re-verifies the holder name before registration.
4. `POST /bank-accounts/withdrawal-accounts/nigeria`
5. Persist only provider withdrawal-account ID + bank metadata + masked account number + verified holder name.

MONI Guard treats a bank withdrawal destination as valid only when its saved label resolves to a locally persisted BMONI-verified withdrawal account.

The authorization screen displays the actual verified provider metadata; it does not fabricate `•••• 8241` or a holder name.

The uploaded BMONI material does not provide a guaranteed sandbox GTBank 10-digit account fixture, so MONIFlow does not seed a fake verified GTBank account.

## Human Approval

Persisted state:

`VALIDATING → AWAITING_USER_APPROVAL → APPROVED`

The approval fingerprint is SHA-256 over the approval-sensitive Money Plan snapshot.

Execution routes reject:

- missing plans
- non-approved plans
- stale approval hashes
- changed plans
- missing verified bank destinations
- changed provider balance snapshots

## BMONI Nigerian Offramp Execution

Implemented provider path:

1. Approved persisted plan loaded server-side.
2. Exactly one bank-withdrawal action selected for the current MVP execution route.
3. Managed CNGN wallet loaded.
4. Verified BMONI bank destination loaded.
5. Fresh BMONI balance checked against approved snapshot.
6. `POST /smart-wallets/{smartWalletId}/offramp/nigeria` with `{ bankAccountId, fromAmount }`.
7. Proposal ID persisted idempotently — one provider execution per Money Plan.
8. `POST /smart-wallets/proposals/{proposalId}/approve`.
9. `GET /smart-wallets/proposals/{proposalId}/sign-payload`.
10. Require documented raw 32-byte `hashToSign`.
11. Native device signs with `signTransactionHash(hashToSign, pin)`.
12. PIN/private key stay on device.
13. `POST /smart-wallets/proposals/{proposalId}/sign` with the signature only.
14. `GET /smart-wallets/proposals/{proposalId}` drives processing/completion state.

Owner proof and transaction signing are deliberately different:

- owner proof: `signMessage`
- proposal: `signTransactionHash`

They must never be interchanged.

## Provider Result Policy

MONIFlow never declares an external withdrawal successful because a local timer finished or a signature was submitted.

Provider mapping:

- BMONI `COMPLETED` → MONIFlow execution `COMPLETED`
- BMONI failed/rejected/cancelled terminal states → `FAILED`
- every other non-terminal state → `PROCESSING`

The mobile execution/result UI polls the BMONI proposal and displays the provider state.

## Persistence

Supabase/Postgres private schema is used for durable server state.

Execution-related persistence includes:

- money plans and approval hashes
- plan actions / Guard state
- BMONI wallet ownership metadata
- BMONI-verified bank destination metadata
- provider proposal/execution state

`moniflow_private.provider_executions` has one row per Money Plan and a unique provider proposal ID to prevent automatic duplicate proposal creation on retries.

The Supabase migration for bank labels/provider executions has been applied to the connected MONIFlow project. Security advisor returned no findings after the migration.

## Deployment

`apps/api/vercel.json` now identifies the API project as Fastify. Vercel officially recognizes `src/server.ts` as a Fastify entrypoint.

For the API deployment, configure a separate Vercel project rooted at `apps/api` with server-only environment variables:

- `NODE_ENV=production`
- `BMONI_BASE_URL=https://embedded-dev.bmoni.com`
- `BMONI_API_KEY=<sandbox secret>`
- `BMONI_REQUEST_TIMEOUT_MS`
- `DATABASE_URL=<persistent Supabase/Postgres URL>`

The mobile/web deployment receives only:

- `EXPO_PUBLIC_API_URL=https://<deployed-api>`
- optional dev-only `EXPO_PUBLIC_DEV_LOCAL_USER_ID`

Never expose `BMONI_API_KEY` in `EXPO_PUBLIC_*`.

## Verification Status

### Verified

- GitHub CI install succeeds.
- TypeScript typecheck succeeds.
- Test suite succeeds.
- Supabase execution schema migration applied.
- Supabase security advisor has no findings.
- Vercel-compatible Fastify entrypoint/project configuration is committed.

### Still Requires a Real Provider/Device Run

- deployed API environment actually contains the intended `DATABASE_URL`
- deployed API can reach BMONI with the real sandbox API key
- one BMONI sandbox user completes the entire lifecycle
- native owner wallet/owner-proof run on a development build
- sandbox KYC document images accepted
- BMONI reports NGN rail active
- NGN virtual account created/read for that user
- sandbox funds credited and visible
- a provider-valid Nigerian/GTBank account verifies and registers
- real BMONI offramp proposal is created
- raw `hashToSign` is signed by the native device
- BMONI accepts the proposal signature
- BMONI returns a terminal proposal state

These are intentionally not marked complete until the external provider/device actually reports them.

## Sandbox Funding Reality

BMONI sandbox wallets begin empty. The documented standard sandbox credit is NGN 1,000 and USD 10; larger amounts can be requested for a specific scenario.

The canonical MONIFlow demo uses NGN 300,000 current available, NGN 40,000 external withdrawal, and NGN 20,000 internal allocation. Request NGN 300,000 for the sandbox demo if BMONI permits it; otherwise the demo must use the actual provider-backed balance.

## Architecture Decisions

- Intent Engine decides only what the user explicitly requested.
- Money Plan explains financial consequences before execution.
- MONI Guard is deterministic and server-authoritative.
- Human approval is separate from Guard clearance.
- Device signature is separate from human approval.
- BMONI provider status is the source of truth for external execution success.
- Pockets remain MONIFlow application bookkeeping unless BMONI explicitly provides equivalent partitioning semantics.
- Never use real identity data in BMONI sandbox.
