# MONIFlow Project State

## Current Phase

Phase 10 — MONI Guard

Phase 10 remains implemented on `main`, but before Phase 11 the earlier BMONI lifecycle has been re-audited and Phase 6 has now been repaired specifically against the current Nigeria NGN KYC documentation.

## Working

- Phase 1 pnpm workspace, Expo Router mobile app, Fastify API, and package boundaries
- Phase 2 MONIFlow visual system and reusable components
- Phase 3 shell/navigation and static product journey
- Phase 4 sandbox BMONI REST client, user creation, local → `bmoniUserId` mapping
- Phase 5 React Native BMONI wallet integration, owner-proof signing, managed CNGN wallet persistence
- Phase 6 Nigeria NGN KYC/onboarding code repaired to the Nigeria-specific provider contract
- Phase 7 provider wallet/balance/deposit-account reads
- Phase 8 deterministic Intent Engine
- Phase 9 provider-balance Money Plan arithmetic
- Phase 10 deterministic MONI Guard and guarded authorization boundary
- native BMONI device adapter exposes both:
  - `signMessage` for EIP-191 owner proof
  - `signTransactionHash` for future raw proposal-hash signing
- repo documentation includes:
  - `docs/BMONI_INTEGRATION.md`
  - `docs/BMONI_CAPABILITY_MAP.md`
  - `docs/BMONI_SANDBOX_RUNBOOK.md`
  - `docs/BMONI_SOURCE_RECONCILIATION.md`

## BMONI Lifecycle Authority

MONIFlow must prove the same sandbox user through:

1. User
2. Wallet
3. Nigeria NGN KYC/onboarding
4. Active NGN rail
5. Funded balance
6. Money movement

A later stage must not be treated as valid while an earlier prerequisite is incomplete.

## Phase 6 — Repaired Nigeria NGN Contract

Phase 6 is intentionally scoped to the Nigerian **NGN local account / CNGN rail**, not the later Nigerian USD Enhanced Due Diligence path.

The Nigeria-specific provider page defines the NGN local-account onboarding trigger as:

`POST /v1/users/{userId}/onboarding/start-nigeria`

with:

- `bvn`
- `ngnWalletAddress`
- `ngnWalletIndex`

MONIFlow now prepares the NGN KYC profile using the Nigeria-specific fields before that rail call:

### Personal info

- `firstName`
- optional `lastName`
- `phoneNumber`
- `dateOfBirth`
- optional `gender`

### Nigerian address

- `streetLine1`
- `city`
- `state`
- `postalCode` — exactly 6 digits
- `countryCode: "NGA"`

### Identification numbers

- exactly one BVN entry for Phase 6:
  - `type: "bvn"`
  - 11-digit `number`
  - `issuingCountryCode: "NGA"`

The previous `addressDetails.street` shape has been removed.

The BVN helper lookup remains fetch-only. MONIFlow uses it to confirm the documented sandbox persona, then explicitly PATCHes the NGN KYC profile because the lookup itself writes nothing.

After the profile is prepared, MONIFlow calls `start-nigeria` with the persisted CNGN smart-wallet address and wallet index `0`, then reads `GET /onboarding/status`. Only BMONI provider status can make the rail ready.

## Nigeria NGN vs Nigerian USD

Do not mix these flows.

### Phase 6 / hackathon NGN local account

- BVN
- Nigerian profile/address
- CNGN wallet
- `start-nigeria`
- provider onboarding status

### Later Nigerian USD account

The Nigeria-specific docs describe USD as a second EDD stage with additional employment/compliance/document requirements and `POST /kyc/activate`, followed by USD readiness/onboarding. MONIFlow does not perform that USD EDD in Phase 6.

## Sandbox Persona

Preferred demo persona:

- Bunch Dillon
- phone `+2348000000000`
- BVN `95888168924`
- NIN `63184876213`

Do not use real identity values in sandbox. Do not mix persona identity numbers with another name or phone.

## Sandbox Funding Reality

BMONI sandbox wallets start empty. The standard test-token credit is NGN 1,000 and USD 10, with the docs allowing a request for more for a specific test scenario.

MONIFlow's canonical demo commits NGN 60,000 and visually assumes NGN 300,000 current available. Request NGN 300,000 for the demo sandbox phone if BMONI will grant it. If the provider balance is smaller, the demo must use the real provider amount instead of a hardcoded NGN 300,000.

## MONI Guard

Rules:

- `SUPPORTED_INTENT`
- `POSITIVE_AMOUNT`
- `CURRENCY`
- `BALANCE`
- `DESTINATION`
- `AMOUNT_INTEGRITY`
- `PLAN_INTEGRITY`
- `HUMAN_APPROVAL`

Verdict policy:

- `BLOCK` when a critical rule fails
- `REVIEW` when safety checks pass but external movement requires explicit human authorization
- `ALLOW` when checks pass and no external authorization is required

The current destination rule verifies intent-to-plan destination integrity only. Real provider bank verification belongs to the upcoming bank flow.

## Provider Execution Contracts Recorded for Future Phases

Nigeria withdrawal will later use the provider bank-discovery/verification/registration/offramp path, then proposal signing with the device owner key. Owner-proof `signMessage` and proposal `signTransactionHash` must never be interchanged.

## Tests Added for the Phase 6 Repair

`apps/api/src/services/bmoni/nigeria-kyc-schema.test.ts` covers:

- the repaired Nigeria NGN KYC profile shape
- rejection of the old `addressDetails` shape
- six-digit Nigerian postal-code enforcement

These tests are committed but have not yet been executed from this chat environment.

## Not Yet Live Verified

- same-user live sandbox user creation
- native owner wallet creation on a real development build
- owner-proof challenge → EIP-191 signature → managed CNGN wallet
- repaired Phase 6 profile PATCH accepted by the live BMONI sandbox
- `start-nigeria` accepted for that same user/wallet
- onboarding status reports NGN active
- NGN virtual-account creation/read
- sandbox funding credited and visible in provider balance
- provider-approved Nigerian bank destination
- bank verification/registration
- Nigeria offramp proposal execution
- proposal hash signing and provider completion status
- `pnpm install`, `pnpm typecheck`, and `pnpm test` after recent workspace changes
- lockfile regeneration

## Verification Gate Before Phase 11

Do not start Phase 11 until the same sandbox identity passes these checks in order:

1. `POST /api/onboarding/user` returns/persists one `bmoniUserId`.
2. Native device reports/creates one owner address using `hasWallet()` → `walletAddress()` or `initWallet()`.
3. Owner-proof challenge is created for `CNGN`.
4. Device signs challenge text with `signMessage`.
5. Managed CNGN smart wallet is created and persisted.
6. Nigeria Phase 6 submits the repaired profile and BMONI accepts it.
7. `POST /onboarding/start-nigeria` is accepted for the same `bmoniUserId` and CNGN wallet address.
8. `GET /onboarding/status` reports the NGN currency/rail active or equivalent documented ready state.
9. NGN funding route/account is created/read where supported.
10. Sandbox test funds are requested and `GET /smart-wallets/account/balances` shows a real spendable CNGN/NGN balance.
11. Home displays that provider-backed balance rather than a mock.
12. Run `pnpm install`, `pnpm typecheck`, and `pnpm test` successfully.

Only after all twelve are true should MONIFlow proceed to Phase 11 human approval and then the real Nigerian bank/offramp path.

## Environment Variables

API/server only:

- `NODE_ENV`
- `API_HOST`
- `API_PORT`
- `BMONI_BASE_URL`
- `BMONI_API_KEY`
- `BMONI_REQUEST_TIMEOUT_MS`
- `DATABASE_URL`

Mobile/web:

- `EXPO_PUBLIC_API_URL`
- optional dev-only `EXPO_PUBLIC_DEV_LOCAL_USER_ID`

Never expose `BMONI_API_KEY` through an `EXPO_PUBLIC_*` variable.

## Architecture Decisions

- Intent Engine answers what the user explicitly asked for.
- Money Plan Engine explains the financial consequence.
- MONI Guard validates the plan deterministically.
- Human approval is separate from Guard clearance.
- Device signing is separate from human approval.
- BMONI provider status is the only source for provider execution success.
- Pockets remain MONIFlow application bookkeeping unless BMONI explicitly provides partitioning semantics for the use case.
- Currency-specific provider documentation governs currency-specific integration behavior.
