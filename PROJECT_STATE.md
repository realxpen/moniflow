# MONIFlow Project State

## Hustle receipt outbox delivery — Test-only Phase 03 (2026-10-13)

Owner approved merged MONIFlow #6 (298f87c) and Hustle #111 (14a8dbe). Branch feat/hustle-receipt-delivery-outbox adds a SQLite/PostgreSQL durable recovery queue for authenticated `operation.received` notifications, atomic 30s lease, at-least-once retries with finite attempt cap and an explicitly invoked test-only sender restricted to 127.0.0.1 Hustle sandbox inbox. The sender never executes BMONI/PSP, changes money or starts automatically. The existing command store remains RECEIVED-only; new test demonstrates crash replay protection and queue recovery. CI/PR pending; docs/HUSTLE_RECEIPT_PUSH_OUTBOX_SANDBOX.md.

## Hustle signed command-receipt evidence — Phase 02 (2026-10-13)

Following Hustle PR #110 merged at 3ca7ef2 with 3/3 CI passed, this MONIFlow branch adds a sandbox-only, opt-in signed readback endpoint for persisted `RECEIVED` commands. HMAC covers exact return payload bytes (domain-separated from signed request authentication); readback includes amount, command digest, operation/event ID and `simulated=true`, `executionStarted=false`, `realFundsMoved=false`. No payment success, provider evidence, outbox push, bank API call or financial movement exists. MONIFlow and Hustle remain independent financial domains. CI and review pending; see `docs/HUSTLE_SIGNED_RECEIPT_V1.md`.

## Hustle Partner Sandbox API — Stacked Phase 01 (2026-10-13)

Following owner acceptance/merge of Hustle P0 #107 and read-only reconciliation #108, a MONIFlow feature branch `feat/hustle-partner-sandbox-auth-api` (stacked on still-open partner-contract PR #3) implements a **disabled-by-default, non-production-only, sandbox-provider-only** HMAC-authenticated partner command intake. Raw-body method/path/timestamp/nonce signatures and persistent replay prevention, operation idempotency and opaque tenant-limited operation reads are added using SQLite/PostgreSQL. POST collection/payout/refund are **only recorded as RECEIVED**, never executed: NO BMONI calls, bank movement, custody, wallet ledger writes, customer fund claims, live deployment or enabled production routes. See `docs/HUSTLE_PARTNER_SANDBOX_API_ACCEPTANCE.md`; CI/PR review pending. Sandbox partner API is an independent track and does not change the MONIFlow hackathon/mobile demo priority.

## Cross-Project Hustle Integration — Phase 00 (2026-10-13)

Owner authorized starting the separate Hustle × MONIFlow payment architecture track without switching on real money movement. Branch `feat/hustle-phase00-partner-contracts` defines strict shared v1 sandbox-only financial operation/event Zod schemas, tests and `docs/HUSTLE_PARTNER_INTEGRATION_V1.md`. No partner HTTP endpoints, money movement, provider changes, KYC changes, or production credentials. Existing MONIFlow demo priority stays intact. Partner authentication, durable operation store and owner-scoped identity authorization remain P0 next-phase work. Hustle owns transaction truth and ledger; MONIFlow coordinates execution only. **PR/CI/merge pending; BMONI user 409 provider blocker unchanged.**


## Current Gate

**Phase 18 — mobile demo hardening is built and green.**

MONIFlow now has a deterministic, provider-aware hackathon path that can run end to end against the explicitly simulated `moniflow-sandbox` provider while preserving the real BMONI adapter and all live-provider safety boundaries.

The current development goal is no longer to add more financial behavior. The next gate is to pull this build onto a real local/mobile environment and prove the complete canonical journey visually and interactively before optional LLM work.

## Canonical Build State

| Area | State | Meaning |
| --- | --- | --- |
| Phases 0–3 — foundation/UI/shell | ✅ Built | Monorepo, API, mobile shell, design system and navigation are established. |
| Phase 4 — BMONI foundation | 🟡 Provider-blocked | BMONI connectivity was proven, but the existing Nigerian sandbox personas return `409` without exposing the existing `bmoniUserId`; real user mapping still needs provider-supported recovery. |
| Phase 5 — device wallet | 🟡 Code built | BMONI native SDK, owner key, PIN, owner proof, managed CNGN wallet and persistence path exist. Physical-device proof is still required. |
| Phase 6 — Nigeria KYC | 🟡 Code built | Nigeria onboarding/KYC path exists; live BMONI completion is not yet proven. |
| Phase 7 — wallet/balance | ✅ Sandbox / 🟡 BMONI | Provider wallet and balance readback work through the provider abstraction. Real BMONI wallet/balance still waits for live identity recovery. |
| Phase 8 — Intent Engine | ✅ Built | Deterministic intent parsing. |
| Phase 9 — Money Plan | ✅ Built | Server-persisted financial consequences using available-to-spend accounting. |
| Phase 10 — MONI Guard | ✅ Built | Deterministic server-authoritative safety rules. |
| Phase 11 — Human Approval | ✅ Built | Persisted approval plus plan fingerprint protection. |
| Phase 12 — Nigerian bank destination | ✅ Sandbox / 🟡 BMONI | Provider-backed bank destination flow exists; sandbox bootstrap supplies an explicitly synthetic verified destination. Live BMONI verification remains unproven. |
| Phase 13 — provider execution | ✅ Sandbox / 🟡 BMONI | Proposal, signing boundary, provider-status tracking and finalization exist. BMONI external completion is never faked. |
| Phase 14 — Pockets / Money Spaces | ✅ Built | Persisted internal bookkeeping for SQLite and Postgres with idempotent allocation. |
| Phase 15 — Financial Memory | ✅ Built | Persisted EXT/INT activity with provider/internal source distinction. |
| Phase 16 — optional LLM | ⏳ Not started | Must remain advisory/interpretive only; deterministic plan/Guard/approval/execution boundaries remain authoritative. |
| Phase 17 — polish | ✅ Core demo polished | Judge-facing mock/static bank and profile states were removed. |
| Phase 18 — demo hardening | ✅ Built | Mobile recovery, foreground refresh, retry states, bounded reads, session checkpoints and bundle CI are implemented. |
| Phase 19 — presentation | ⏳ Next after device proof | Final presentation/demo capture should use the verified mobile path. |

## Financial Provider Architecture

MONIFlow has one product surface and two provider implementations:

```text
MONIFlow mobile
    ↓
MONIFlow API
    ↓
Financial provider boundary
    ├── moniflow-sandbox   simulated development infrastructure
    └── bmoni              real BMONI Embedded adapter
```

`FINANCIAL_PROVIDER=moniflow-sandbox` is permitted only as explicitly simulated infrastructure. UI and API state must continue to label it as simulated.

`FINANCIAL_PROVIDER=bmoni` preserves the real BMONI path. The sandbox provider must never be presented as evidence that BMONI completed a wallet, KYC, bank or transfer operation.

## Canonical Sandbox Demo

The development bootstrap/reset path creates a fresh sandbox workspace without deleting prior history.

Canonical instruction:

> Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.

Expected deterministic accounting:

```text
Opening provider balance     ₦300,000
External withdrawal          -₦40,000
Provider balance              ₦260,000
Laptop internal allocation    ₦20,000
Available to spend            ₦240,000
```

The Laptop allocation is MONIFlow bookkeeping. It is not represented as a separate provider-held sub-balance.

Repeated execution finalization must remain idempotent: the same plan cannot allocate the Laptop amount or write the same Financial Memory event twice.

## Mobile Demo Hardening

The active judge-facing mobile path no longer depends on the old static preview fixtures.

Implemented hardening includes:

- persisted non-secret workspace context using AsyncStorage + Zustand;
- saved `localUserId`, active provider, command, server `planId` and recovery stage;
- no PIN, private key, signature, BMONI API key, BVN/NIN or raw bank account number stored in the recovery session;
- Welcome detects a saved workspace and requires an explicit **Resume workspace** action;
- app restart never automatically enters approval, signing or execution;
- Home is the recovery hub and exposes an explicit **Resume flow** action;
- Money Plan, MONI Guard, approval, execution and result checkpoints update the recoverable stage;
- Home, Profile, Pockets, Activity, Wallet Details, Approval, Execution and Result refresh from authoritative API state after foregrounding;
- provider execution polling prevents overlapping status requests;
- network-bound provider/read paths use bounded mobile requests instead of waiting indefinitely;
- failed refreshes preserve the last successfully loaded screen state and expose explicit retry controls;
- completed Result clears the unfinished-flow marker only when the user explicitly returns Home;
- the obsolete `/bank/select`, `/bank/verify`, `/bank/success` static preview routes were deleted;
- `apps/mobile/constants/mockData.ts` was deleted;
- Profile, bank destination, Pockets and Activity are API-backed rather than static preview state.

## Human Approval and Recovery Safety

Recovery must never bypass the human approval boundary.

A restored session may remember that a flow was being reviewed, but MONIFlow must return the user to a safe visible checkpoint. It must not automatically approve a plan, sign a digest, submit a signature, or infer provider completion after restart/backgrounding.

Approval-sensitive state is protected by the persisted plan fingerprint. If amount, destination, action structure, totals or another approval-sensitive field changes, the prior approval is invalid and the server must require review again.

## BMONI Live Blocker

Both documented Nigerian sandbox personas were already present in the provider sandbox when tested. `POST /v1/users` returned `409` and the response exposed no recoverable provider user ID.

MONIFlow therefore correctly returns `RECONCILIATION_REQUIRED` instead of guessing, creating random replacement identities, or manually inventing a `bmoniUserId`.

The BMONI path remains blocked until the provider supplies one of:

1. the supported way to recover the existing sandbox `bmoniUserId`; or
2. a reset/released Nigerian sandbox persona for the partner account.

Once a real mapping is available, the live verification chain resumes from user mapping → device wallet → owner proof → managed CNGN wallet → KYC → balance → bank destination → provider execution.

## Device Wallet Boundary

Real BMONI device flow remains:

1. create/recover on-device owner key;
2. set or verify the local signing PIN;
3. request BMONI owner-proof challenge;
4. sign owner-proof text with `signMessage`;
5. create managed CNGN wallet;
6. persist only safe owner/provider wallet metadata;
7. later sign proposal raw digest with `signTransactionHash`.

Owner proof and proposal signing are deliberately different:

- owner proof → `signMessage`
- provider proposal digest → `signTransactionHash`

Private keys and the raw PIN remain on-device.

## Provider Result Policy

MONIFlow never declares external movement successful because a local timer completed, a proposal was created, a signature was submitted, or the app restarted.

Provider status remains authoritative:

- provider terminal success → MONIFlow `COMPLETED`;
- provider terminal failure/rejection/cancellation → MONIFlow `FAILED`;
- non-terminal provider state → MONIFlow remains preparing/signing/processing as appropriate.

Internal Pockets/Financial Memory finalization occurs only after the provider execution is confirmed complete by the selected provider implementation.

## Current CI Gate

GitHub Actions **MONIFlow CI #187** passed on the Phase 18 hardening branch head.

Verified gates:

- dependency install ✅
- workspace TypeScript check ✅
- Expo mobile web export ✅
- automated tests ✅

The CI workflow now includes a real `expo export --platform web` gate so typed routes and bundle-level regressions are caught in addition to TypeScript/tests.

## Next Verification Gate

Before optional LLM work, pull `main` locally and prove the complete mobile demo path:

1. start API with `FINANCIAL_PROVIDER=moniflow-sandbox`;
2. launch the native/development mobile build;
3. start a clean sandbox workspace;
4. verify Home shows ₦300,000 available;
5. run the canonical multi-action instruction;
6. inspect Intent → Money Plan → MONI Guard;
7. explicitly approve;
8. complete the clearly-labelled simulated signing boundary;
9. observe provider execution to terminal state;
10. verify final accounting is ₦260,000 provider / ₦20,000 Laptop / ₦240,000 available;
11. verify Financial Memory contains the EXT withdrawal and INT allocation once each;
12. background/reopen the app and verify workspace state refreshes correctly;
13. interrupt a flow, reopen, and verify MONIFlow requires an explicit Resume action rather than auto-continuing;
14. run the flow twice from clean workspaces to verify repeatability.

After this device/demo gate passes, Phase 16 optional LLM intelligence can be added without giving the model authority over Guard, human approval, signing or provider execution.

## Non-Negotiable Architecture Decisions

- Intent Engine represents only supported, explicitly understood user intent.
- AI/LLM output never directly authorizes or executes money movement.
- Money Plan explains consequences before movement.
- available-to-spend = provider balance minus MONIFlow internal allocations.
- MONI Guard is deterministic and server-authoritative.
- Human approval is separate from Guard clearance.
- Device/provider signing is separate from human approval.
- Provider status is the source of truth for external completion.
- Pockets are MONIFlow internal bookkeeping unless a provider explicitly offers equivalent partition semantics.
- No BMONI API key may be exposed through `EXPO_PUBLIC_*` or a client bundle.
- Never store a user's private wallet key or raw PIN on the MONIFlow backend.
- Never use real identity data in BMONI sandbox.
- Never fake BMONI success to unblock the demo.
