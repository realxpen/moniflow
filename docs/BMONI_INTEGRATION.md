# BMONI Integration Boundary

## Status

MONIFlow uses BMONI Embedded as the provider/infrastructure layer for the hackathon sandbox flow. This document is the repo-level integration authority for implementation work, but the provider documentation remains the final authority for endpoint names, payloads, signing methods, and state transitions.

The project source now includes BMONI lifecycle, quickstart, sandbox persona, test-token, overview, and use-case documentation. The current Bkey React Native reference client is also used when the uploaded pages disagree about the React Native path.

## Environment and authentication

- Sandbox origin: `https://embedded-dev.bmoni.com`
- Partner REST authentication: `x-api-key` on every request
- Production origin is out of scope for the hackathon
- `BMONI_BASE_URL` contains the origin only, with no `/v1`
- `BMONI_API_KEY` is server-side only and must never be placed in mobile code, an `EXPO_PUBLIC_*` variable, logs, or committed source

## Required lifecycle

Every MONIFlow sandbox user must move through the provider lifecycle in order:

1. **User** — `POST /v1/users` → persist `bmoniUserId`
2. **Wallet** — owner-proof challenge → device `signMessage` (EIP-191) → `create-managed`
3. **KYC** — complete the required Nigeria KYC sequence
4. **Rail** — `POST /v1/users/{userId}/onboarding/start-nigeria`
5. **Fund** — obtain a spendable CNGN balance / NGN rail funding
6. **Move money** — verified Nigerian bank destination → offramp proposal → approval → device hash signature → provider status

Calls that are valid in isolation may still fail if an earlier lifecycle stage is incomplete.

## React Native device boundary

MONIFlow intentionally remains React Native. Bkey maintains an official React Native SDK/reference client using `@bkey-inc/bmoni_embedded_sdk`.

Confirmed device requirements:

- React Native New Architecture enabled
- Android `minSdk 24+`
- Android runtime architecture `arm64-v8a`
- iOS 15.1+ for the React Native package
- native development build required; Expo Go is insufficient

The device owns the private key. The backend never receives or stores it.

### Two signatures — never mix them

The BMONI flow contains two different signing primitives:

| Purpose | Provider data | Device method | Prefix |
|---|---|---|---|
| Smart-wallet owner proof | challenge text | `signMessage(message, pin)` | EIP-191 / personal-sign |
| Proposal / transaction signing | `hashToSign` 32-byte digest | `signTransactionHash(hashToSign, pin)` | **No** EIP-191 prefix |

Using `signMessage` for a proposal hash is invalid. MONIFlow's native device adapter exposes both methods and keeps both unavailable on web.

## Sandbox identity

Do not use real identity data in the BMONI sandbox.

The preferred demo persona is **Bunch Dillon**:

- first name: `Bunch`
- last name: `Dillon`
- phone: `+2348000000000`
- BVN: `95888168924`
- NIN: `63184876213`

Identity values must match the persona. A valid BVN used with a different name/phone intentionally fails verification.

`GET /v1/users/{userId}/kyc/bvn-lookup/{bvn}` is fetch-only. It does not persist KYC data.

## Nigeria KYC sequence

There is a documented inconsistency in the source material:

- the uploaded lifecycle states that Nigeria omits the biometric selfie and `sumsubLevelName`;
- the uploaded zero-to-first-send page says to upload identification, proof of address **and biometric**;
- the current official Bkey React Native reference client agrees with the lifecycle: for NGN, upload identification + proof of address, omit biometric, call readiness, call `POST /kyc/activate` with no `sumsubLevelName`, then call `start-nigeria`.

For MONIFlow's React Native implementation we therefore use the current official React Native reference order:

1. `GET /v1/users/{userId}/kyc/options`
2. `PATCH /v1/users/{userId}/kyc`
3. `POST /v1/users/{userId}/kyc/documents/identification` (multipart)
4. `POST /v1/users/{userId}/kyc/documents/proof-of-address` (multipart)
5. `GET /v1/users/{userId}/kyc/readiness`
6. `POST /v1/users/{userId}/kyc/activate` with no `sumsubLevelName`
7. `POST /v1/users/{userId}/onboarding/start-nigeria` with `bvn`, `ngnWalletAddress`, and `ngnWalletIndex`
8. `GET /v1/users/{userId}/onboarding/status` until NGN is active

If BMONI rejects this exact sequence in the current sandbox, stop and reconcile against the provider's current reference/support rather than inventing another order.

### Current MONIFlow gap

The existing Phase 6 route performs BVN lookup, a minimal KYC patch, and `start-nigeria`, but it does **not yet implement the full document/readiness/activation sequence above**. That Phase 6 checkpoint must therefore remain **not verified** until the KYC flow is brought into line with this contract and exercised live.

## Wallet and balance

Confirmed provider calls already represented in MONIFlow include:

- `GET /v1/users/{userId}/smart-wallets/account/wallets`
- `GET /v1/users/{userId}/smart-wallets/account/balances`
- `GET /v1/users/{userId}/smart-wallets/{smartWalletId}`
- `GET /v1/users/{userId}/bank-accounts/deposit-accounts/NGN`

The current Bkey RN reference also creates the NGN virtual bank account with:

- `POST /v1/users/{userId}/vba/ngn` with `{ smartWalletId }`

MONIFlow currently reads an NGN deposit account when one exists but does not yet create it through `/vba/ngn`.

## Nigerian withdrawal contract for later execution phases

The current Bkey React Native reference records this sequence:

1. `GET /v1/users/{userId}/bank-accounts/nigerian-banks`
2. `POST /v1/users/{userId}/bank-accounts/verify-nigerian-account`
3. `POST /v1/users/{userId}/bank-accounts/withdrawal-accounts/nigeria`
4. `POST /v1/users/{userId}/smart-wallets/{smartWalletId}/offramp/nigeria`
5. proposal moves through approval/signing states
6. `GET /v1/users/{userId}/smart-wallets/proposals/{proposalId}/sign-payload`
7. device signs `hashToSign` with `signTransactionHash`
8. `POST /v1/users/{userId}/smart-wallets/proposals/{proposalId}/sign`
9. fetch proposal/status until provider reports the resulting state

The bank name and CBN code must be reused verbatim from the provider bank list. Registration must use the exact account-holder name returned by the verification call.

## Sandbox funding

Sandbox accounts begin empty. The BMONI test-token process credits a standard NGN 1,000 and USD 10 when approved. The documentation allows asking for more for a specific scenario.

MONIFlow's primary demo requires at least NGN 60,000 before fees because it combines a NGN 40,000 external withdrawal with a NGN 20,000 internal allocation. To keep the canonical UI example at NGN 300,000 current available, request **NGN 300,000 sandbox credit** for the sandbox phone number used to create the BMONI user.

Never present sandbox credits as production money.

## Current implementation status

### Implemented

- sandbox-only BMONI configuration and `x-api-key` backend boundary
- BMONI user creation and durable local → `bmoniUserId` mapping
- React Native device wallet integration
- owner-proof `signMessage` flow
- managed CNGN wallet persistence
- `signTransactionHash` exposed in the native device adapter for future proposal signing
- provider wallet/balance/deposit-account reads
- deterministic Intent Engine
- Money Plan Engine
- MONI Guard

### Not yet provider-complete

- full Nigeria KYC document/readiness/activation sequence
- explicit NGN VBA creation through `POST /vba/ngn`
- real bank discovery/verification/registration
- Nigeria offramp proposal creation
- proposal approval/orchestration
- proposal hash signing + submission in the product flow
- provider-backed completion/activity
- production configuration

## Non-negotiable rules

1. Never invent a BMONI endpoint, enum, payload, response, or signing format.
2. Never move to a later lifecycle stage while a prerequisite stage is incomplete.
3. Never place the partner API key in mobile/web public environment variables.
4. Never transmit the wallet private key to MONIFlow servers.
5. Owner proof uses message signing; proposal signing uses raw hash signing.
6. Never use real BVN/NIN values in the sandbox.
7. Never claim a financial operation succeeded until BMONI reports the corresponding provider state.
8. When uploaded BMONI pages conflict, record the conflict and prefer the current official implementation reference for MONIFlow's actual stack rather than silently guessing.
