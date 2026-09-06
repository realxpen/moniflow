# MONIFlow Project State

## Current Gate

**Stabilization before live BMONI verification.**

MONIFlow's core MVP architecture is substantially implemented, but the project must not advance into Pockets, Activity, optional LLM work, or additional polish until the repository is green and the real BMONI sandbox lifecycle has been proven.

The pre-stabilization reference commit is:

`e24b9ce0a6876dae7e1591031046977acdd1ef8c` — **Align MONIFlow with real BMONI sandbox lifecycle**

GitHub Actions run **MONIFlow CI #116** for that commit failed during **Typecheck**, so its Test step was skipped. Do not describe TypeScript/tests as verified from that run. The stabilization change that follows must re-prove CI and deployment health.

## Canonical Build State

| Area | State | Meaning |
| --- | --- | --- |
| Phases 0–3 — foundation/UI/shell | ✅ Built | Monorepo, API, mobile shell, design system and navigation exist. |
| Phase 4 — BMONI foundation | 🟡 Partial | Real `/health/bmoni` connectivity was proven, but live create-user + persisted `bmoniUserId` checkpoint has not passed yet. |
| Phase 5 — device wallet | 🟡 Code built | Native BMONI SDK, PIN, owner key, owner-proof challenge, `signMessage`, managed CNGN wallet and persistence path exist; real-device run still required. |
| Phase 6 — Nigeria KYC | 🟡 Code built | Current NGN onboarding flow is implemented, including sandbox-persona data handling; provider completion is not yet proven. |
| Phase 7 — wallet/balance | 🟡 Code built | Provider wallet, balance and NGN account readback routes exist; waiting for a real sandbox user/wallet. |
| Phase 8 — Intent Engine | ✅ Built | Deterministic intent parsing. |
| Phase 9 — Money Plan | ✅ Built | Structured consequences and calculations. |
| Phase 10 — MONI Guard | ✅ Built | Deterministic safety rules. |
| Phase 11 — Human Approval | ✅ Built | Persisted approval + fingerprint protection. |
| Phase 12 — Nigerian bank destination | 🟡 Built, unverified live | Real bank list → verify → register path exists; no fake GTBank fixture. |
| Phase 13 — BMONI execution | 🟡 Built, unverified live | Offramp → provider proposal state → signing digest → device signature → BMONI status; no fake completion. |
| Phase 14 — Pockets | ❌ Not real yet | Current Pockets experience is still mock/static and must not be presented as persistent financial state. |
| Phase 15 — Activity | ❌ Not real yet | Current Activity experience is still a static preview. |
| Phases 16–19 | ⏳ Later | Optional LLM, UI polish, demo hardening and presentation. |

## Stabilization Blocker from CI #116

Two concrete TypeScript failures were confirmed on `e24b9ce…`:

1. `apps/mobile/app/landing.tsx` used unsupported React Native `fontWeight: "650"` values. These must use a supported weight such as `"600"`.
2. `apps/mobile/services/bmoni-device.ts` (and the web fallback with the same implementation) exposed unsupported methods as `Promise<never>`. That made `wallet-native.tsx` infer values such as the wallet address as `never`, producing `toLowerCase` errors. The fallback must preserve the native interface types while still throwing at runtime outside iOS/Android development builds.

The native implementation in `bmoni-device.native.ts` remains the real BMONI SDK wrapper; the fallback must not emulate wallet/signing functionality.

## Phase 4 Live Checkpoint

Phase 4 is not complete until MONIFlow proves all of the following against the deployed API and BMONI sandbox:

1. `GET /health` succeeds.
2. `GET /health/bmoni` succeeds.
3. A fresh BMONI sandbox user is created through MONIFlow.
4. The returned `bmoniUserId` is persisted in Supabase/Postgres.
5. Repeating the same local-user onboarding request resolves to `EXISTING_LOCAL_MAPPING` rather than creating another BMONI user.

Until that passes, downstream wallet/KYC/balance code is **built but not provider-verified**.

## BMONI User Mapping Safety

`POST /api/onboarding/user` and `/api/onboarding/users` call the server-side BMONI user service.

Expected provisioning states include:

- `CREATED`
- `EXISTING_LOCAL_MAPPING`
- `RECONCILIATION_REQUIRED`
- `NOT_CONFIGURED`
- `NOT_CREATED`
- `OUTCOME_UNKNOWN`

MONIFlow must not automatically retry an ambiguous create-user outcome because that can fork provider identity state.

## Device Wallet Boundary

The intended native lifecycle is:

1. Create or recover the on-device owner wallet.
2. Configure/verify the signing PIN.
3. Request a BMONI owner-proof challenge.
4. Sign the challenge with `signMessage` (EIP-191 message signing).
5. Create the managed CNGN wallet.
6. Persist only provider wallet/owner metadata required by MONIFlow.

Private keys and the raw PIN remain on the device.

The non-native/web fallback must throw for wallet/signing operations; it exists only so shared/web builds retain correct TypeScript contracts.

## Current Nigeria NGN KYC Implementation

The current code path does **not** depend on a separate BVN-lookup step before KYC submission.

Current application flow:

1. Load BMONI KYC options.
2. Load a provider occupation code where required.
3. Submit the Nigerian KYC profile, including the BVN in `identificationNumbers`.
4. Upload the identification and proof-of-address document payloads accepted by the MONIFlow API.
5. Activate the Nigerian KYC/rail flow.
6. Start/continue Nigerian onboarding with the persisted managed CNGN wallet.
7. Poll provider onboarding status until active/ready or a provider failure/action-required state is returned.
8. Read or create the NGN deposit account.
9. Read BMONI account balances as the source of truth.

For the sandbox persona currently targeted by the build, BVN `22222222222` belongs to **Samson Jabo**. The sandbox profile details must match the provider persona; do not combine the BVN with arbitrary names or real identity data.

Provider completion of this path has **not** yet been proven. If live BMONI behavior differs from the checked-in assumptions, current BMONI documentation/provider responses win; do not fabricate a successful state.

## Nigerian Bank Destination

Implemented provider path:

1. Load Nigerian banks from BMONI.
2. Verify the entered Nigerian bank account through BMONI.
3. Confirm the provider-returned account-holder identity.
4. Register the provider withdrawal account.
5. Persist provider withdrawal-account ID plus safe bank metadata/masked account data.

MONI Guard considers a bank-withdrawal destination valid only when the saved label resolves to a persisted BMONI-verified destination.

There is no seeded fake GTBank account. A provider-valid account must be used for live verification.

## Human Approval Boundary

A Money Plan must be explicitly approved and remain unchanged before external execution.

Approval-sensitive state is protected by a SHA-256 fingerprint. If the plan's amount, destination, action structure, totals, provider-backed balance snapshot or another approval-sensitive field changes, approval is invalidated and execution is blocked until the plan is rebuilt/revalidated/reapproved.

Human approval is separate from device signing.

## Current BMONI Nigerian Offramp Execution

The current execution route follows this application flow:

1. Load the approved persisted Money Plan server-side.
2. Require exactly one bank-withdrawal action for the MVP execution path.
3. Load the persisted BMONI user mapping.
4. Load the managed CNGN wallet.
5. Load the verified BMONI Nigerian withdrawal destination.
6. Re-read the provider-backed CNGN balance.
7. If the provider balance differs from the approved snapshot, invalidate approval and return `BALANCE_CHANGED_REPLAN_REQUIRED`.
8. Call the BMONI Nigeria offramp operation and persist the returned proposal ID idempotently — one provider execution per Money Plan.
9. Read the provider proposal state.
10. Wait until the provider reports the proposal ready for signatures (`PENDING_SIGNATURES`).
11. Request the proposal sign payload.
12. Require the documented raw 32-byte `hashToSign`.
13. Native device signs with `signTransactionHash(hashToSign, pin)`.
14. Submit only the signature to BMONI.
15. Move local execution state to `PROCESSING` after BMONI accepts the signature.
16. Follow-up provider reads drive `COMPLETED`, `FAILED`, or continued processing.

The current MONIFlow execution route does **not** insert a separate application-side proposal `/approve` call between offramp creation and sign-payload retrieval. Do not reintroduce the older manual-approve assumption unless current provider documentation/live behavior explicitly requires it.

Owner proof and proposal signing are deliberately different:

- owner proof → `signMessage`
- proposal digest → `signTransactionHash`

They must never be interchanged.

## Provider Result Policy

MONIFlow never declares an external withdrawal successful because a local timer finished, a proposal was created, or a signature was submitted.

Provider mapping remains:

- BMONI terminal success such as `COMPLETED` → MONIFlow `COMPLETED`
- BMONI terminal failed/rejected/cancelled state → MONIFlow `FAILED`
- non-terminal provider state → `PREPARING`, `AWAITING_DEVICE_SIGNATURE`, or `PROCESSING` as appropriate

The BMONI proposal/status response is authoritative for external execution success.

## Persistence

Supabase/Postgres private schema is the durable server-state layer for the deployed API.

Persisted execution-related data includes:

- local ↔ BMONI user mapping
- managed wallet ownership metadata
- Money Plans and approval hashes
- plan actions / Guard state
- BMONI-verified bank destination metadata
- provider proposal/execution state

`moniflow_private.provider_executions` keeps one provider execution per Money Plan and prevents automatic duplicate proposal creation on retries.

## Deployment Snapshot Before Stabilization

At the `e24b9ce…` checkpoint:

- `moniflow` Vercel deployment: ✅ success
- `moniflow-api` Vercel deployment: ❌ failure
- GitHub CI #116: ❌ Typecheck failure
- Tests in CI #116: ⏭ skipped because Typecheck failed

The exact `moniflow-api` Vercel failure cause was not confirmed because the available Vercel session did not expose the `swifnatechnologyltd` team scope. Do not speculate about that failure from this file.

After stabilization, verify **both** Vercel deployments and the new GitHub CI run before beginning the live BMONI user test.

## Critical Live Verification Chain

After the stabilization gate is green, execute this exact chain:

1. `GET /health`
2. `GET /health/bmoni`
3. Create fresh BMONI sandbox user
4. Persist `bmoniUserId`
5. Repeat onboarding request → `EXISTING_LOCAL_MAPPING`
6. Native device wallet
7. Owner-proof challenge
8. `signMessage`
9. Managed CNGN wallet
10. Read real wallet + CNGN balance
11. Nigeria KYC
12. NGN rail active
13. NGN funding/deposit account
14. Nigerian bank verification + registration
15. Real sandbox Nigerian withdrawal/offramp proposal
16. Provider proposal reaches signing-ready state
17. `signTransactionHash`
18. BMONI accepts signature
19. BMONI returns a terminal proposal state

Do not build Phase 14 Pockets, Phase 15 Activity, optional LLM work, or additional UI polish before the live chain reaches at least **user → wallet → KYC → balance**.

## Sandbox Funding Reality

BMONI sandbox wallets begin empty. The documented standard sandbox credit is NGN 1,000 and USD 10; a larger amount may need to be requested for the canonical demo.

The canonical MONIFlow demo uses:

- current available: NGN 300,000
- external withdrawal: NGN 40,000
- internal Laptop allocation: NGN 20,000

If the provider does not supply NGN 300,000 in sandbox, the live demo must use the actual provider-backed balance and mathematically valid amounts. Never hardcode a fake provider balance as though it were live.

## Non-Negotiable Architecture Decisions

- Intent Engine decides only what the user explicitly requested.
- Natural-language/AI output never directly executes money movement.
- Money Plan explains financial consequences before execution.
- MONI Guard is deterministic and server-authoritative.
- Human approval is separate from Guard clearance.
- Device signature is separate from human approval.
- BMONI provider status is the source of truth for external execution success.
- Pockets remain MONIFlow application bookkeeping unless BMONI explicitly provides equivalent partitioning semantics.
- No BMONI API key may be exposed through `EXPO_PUBLIC_*` or client bundles.
- Never store the user's private wallet key on the MONIFlow backend.
- Never use real identity data in BMONI sandbox.
- Never fake provider success to unblock the demo.
