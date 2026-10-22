# Phase 38 — BMONI partner sandbox and Android device evidence gate

**Date:** 2026-10-22  
**Status:** SOURCE-ONLY SAFETY IMPROVEMENT / PROVIDER AND PHYSICAL DEVICE STILL ON HOLD  
**Scope:** No BMONI registration, KYC upload/activation, NGN rail start, transfer, signing, Expo build, deployment, or production feature enablement.

## Why we cannot activate BMONI yet

The latest verified Waydroid x86_64 preview demonstrates a **local, educational six-step flow**, not a managed wallet or actual provider transaction. It cannot run BMONI's arm64-v8a signer. A real physical ARM64 Android runtime and a verified device ownership challenge/signature are still untested.

The repo's provider-side records and prior sandbox attempts do not establish a dedicated, authorized MONIFlow partner key or a recoverable provider user ID:
- The documented Bunch Dillon and Samson Jabo test identities previously returned HTTP 409 / identity reconciliation holds. A collision is not a provider user mapping. No blind retry.
- A public shared developer key/fixture is not dedicated partner permission, does not authorize production or link the logged-in MONIFlow user, and is not KYC.
- App sign-in, healthy `GET /health/provider`, locally recorded mapping, wallet metadata and an APK build each prove different things. None establishes settlement.
- The BMONI Nigeria KYC documents currently disagree on biometric and activation details. The repo tracks the reconciliation and must obtain authoritative confirmation before running sensitive provider flows.

## Implemented in this source batch

1. All **POST** routes under `/api/onboarding/nigeria` (KYC profile start, multipart document upload, KYC activation/rail start) now reuse the existing server-side `BMONI_PARTNER_ONBOARDING_ENABLED` gate. When it is off or `FINANCIAL_PROVIDER` is not `bmoni`, these routes return HTTP 423 `PARTNER_ACCESS_PENDING` with `retryable:false` **before** body processing, provider calls or document handling. Unlike fixtures used to test user registration, `NODE_ENV=test` does not bypass this gate.
2. Read-only Nigeria status/metadata requests are not made into mutations by the gate. Authentication/owner authorization remains as defined in the existing production API middleware.
3. The old Nigeria rail status classifier scanned the **entire JSON document for the words** `ready`, `completed` or `active`. It could classify a note, nested field or contradictory status as ready. It now interprets **only a recognised explicit top-level `status` value**, and conservatively reports `processing` for undocumented structures. This is a provisional fail-closed display rule, **not** a BMONI contract confirmation. If the provider uses a different response envelope, reconcile the exact schema privately before accepting its readiness.
4. Automated negative tests cover every locked POST, the unchanged GET validation route and ambiguous/contradictory status payloads.

**Important limitation:** An operator setting the existing feature flag to true does not by itself prove a dedicated key, verified device, KYC readiness or legal authority. The flag MUST remain **false** in all deployed environments until independent provider permission and a separately approved release gate are established.

## Provider-led integration steps and evidence required

| Lifecycle stage | Required proof | Current decision |
|---|---|---|
| 1. User | Dedicated MONIFlow sandbox access, approved existing-user lookup/recovery, real provider ID owned by intended private user | BLOCKED |
| 2. Wallet | Supported ARM64 device, owner-proof challenge, EIP-191 `signMessage`, provider-confirmed managed CNGN wallet ownership | NOT VERIFIED |
| 3. KYC | Matched authorized sandbox persona, exact documented ID/PoA/readiness/activation sequence, provider KYC status | BLOCKED |
| 4. Nigeria rail | Explicit provider status for that user/NGN rail, not an arbitrary note or local flag | NOT VERIFIED |
| 5. Funding | Provider-side sandbox funds/balance, no assumed ₦300,000; user/scoped read permissions | NOT VERIFIED |
| 6. Money movement | Verified bank beneficiary, reviewed plan, human approval, raw `signTransactionHash`, independent provider result and reconciliation | DISABLED |

Do not upload BVN/NIN, identity photos, passwords, wallet keys, PIN, partner tokens or personal details into GitHub issues, build logs or ChatGPT. Retain provider transaction references only in private, access-controlled evidence.

## Safe physical-device test procedure — separate approval

After an expressly approved **new ARM64 internal preview** from the then-current commit:
- On a compatible physical Android phone (not Waydroid), verify package/ABI, cold start, keyboard, tab navigation, 100/150/200% text, TalkBack and sign-in/out/second test account with redacted screenshots.
- Test offline → reconnect and background → resume. Require previous user's data to disappear immediately on account switch. Pending network mutations must not automatically resubmit.
- Use only a disposable test account. Until dedicated provider consent, do **not** initialize a wallet, submit identity documents, sign a proposal, approve a real transfer, or request real funds.
- A completed EAS cloud build is **not** proof of physical device compatibility or key custody.

## Current build/release constraint

Earlier one-time source tickets are spent and cannot be rerun. The later PR #66 post-PR65 Waydroid one-shot workflow failed at its exact source/ticket preflight, so it does **not** prove another completed APK. Do not retry its one-shot job. This source batch requests no new Expo build.

## Acceptance for this batch

- CI: TypeScript, tests, mobile web export and disposable PostgreSQL.
- Nigeria POSTs locked by default even in ordinary test runtime.
- No provider readiness falsely inferred from arbitrary nested/word-matched content.
- Native and provider activation explicitly **HOLD** until independent evidence and owner approval.

Primary repo authorities: `docs/BMONI_INTEGRATION.md`, `docs/BMONI_PARTNER_SANDBOX.md`, `docs/BMONI_CAPABILITY_MAP.md`, `docs/BMONI_SOURCE_RECONCILIATION.md`, `docs/PHASE24_KYC_DEVICE_READINESS.md`, and `docs/POST_FIGMA_NATIVE_PREVIEW_RUNBOOK.md`.
