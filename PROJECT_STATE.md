# MONIFlow Project State

## Current Phase

Phase 10 — MONI Guard

Phase 10 is implemented on `main` as the deterministic safety boundary between Money Plan explanation and human authorization. MONI Guard is a standalone workspace package, contains no LLM call, evaluates explicit rules, fails closed on critical mismatches, and returns `ALLOW`, `REVIEW`, or `BLOCK`.

A BMONI documentation audit was performed after the project's lifecycle, quickstart, sandbox-data, test-token, overview, and use-case sources were added. The audit uncovered one important earlier integration gap: the existing Phase 6 Nigeria route is not the complete current React Native KYC path and must not be marked provider-verified yet.

## Working

- Phase 1 pnpm workspace, Expo Router mobile app, Fastify API, and package boundaries
- Phase 2 MONIFlow visual system and reusable components
- Phase 3 shell/navigation and static product journey
- Phase 4 sandbox BMONI REST client, user creation, local → `bmoniUserId` mapping
- Phase 5 React Native BMONI wallet integration, owner-proof signing, managed CNGN wallet persistence
- Phase 7 provider wallet/balance/deposit-account reads
- Phase 8 deterministic Intent Engine
- Phase 9 provider-balance Money Plan arithmetic
- Phase 10 deterministic MONI Guard and guarded authorization boundary
- native BMONI device adapter now exposes both:
  - `signMessage` for EIP-191 owner proof
  - `signTransactionHash` for future raw proposal-hash signing
- repo documentation now includes:
  - `docs/BMONI_INTEGRATION.md`
  - `docs/BMONI_CAPABILITY_MAP.md`
  - `docs/BMONI_SANDBOX_RUNBOOK.md`

## BMONI Lifecycle Authority

MONIFlow must follow:

1. User
2. Wallet
3. KYC
4. Rail
5. Fund
6. Move money

A later stage must not be treated as valid while an earlier prerequisite is incomplete.

## Nigeria KYC Correction Required

The current Bkey React Native reference uses the fixed NGN sequence:

1. `GET /v1/users/{userId}/kyc/options`
2. `PATCH /v1/users/{userId}/kyc`
3. multipart identification upload
4. multipart proof-of-address upload
5. `GET /v1/users/{userId}/kyc/readiness`
6. `POST /v1/users/{userId}/kyc/activate` with no `sumsubLevelName`
7. `POST /v1/users/{userId}/onboarding/start-nigeria`
8. `GET /v1/users/{userId}/onboarding/status` until NGN is active

The existing Phase 6 route currently performs BVN lookup, a minimal KYC patch, then `start-nigeria`. It is therefore **incomplete** against the current RN reference and must be corrected before the Nigeria rail checkpoint can be considered passed.

There is a source discrepancy: the uploaded zero-to-first-send page lists a biometric upload for Nigeria, while the uploaded lifecycle and current Bkey React Native reference say NGN omits biometric. MONIFlow records the discrepancy and targets the current RN reference for its React Native implementation unless BMONI current sandbox/support says otherwise.

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

Current Bkey RN reference records the Nigeria withdrawal path as:

- `GET .../bank-accounts/nigerian-banks`
- `POST .../bank-accounts/verify-nigerian-account`
- `POST .../bank-accounts/withdrawal-accounts/nigeria`
- `POST .../smart-wallets/{smartWalletId}/offramp/nigeria`
- proposal approval/signing states
- `GET .../smart-wallets/proposals/{proposalId}/sign-payload`
- device `signTransactionHash(hashToSign, pin)`
- `POST .../smart-wallets/proposals/{proposalId}/sign`
- fetch provider proposal/status until final/processing state

Owner-proof `signMessage` and proposal `signTransactionHash` must never be interchanged.

## Not Yet Verified

- full Phase 6 NGN KYC/document/readiness/activation sequence
- Phase 4–7 same-user live sandbox lifecycle
- native wallet owner-proof flow on a real development build
- persistent deployed backend database
- NGN VBA creation through `POST /vba/ngn`
- sandbox wallet funding
- provider-approved Nigerian bank destination
- bank verification/registration
- Nigeria offramp proposal execution
- proposal hash signing and provider completion status
- `pnpm install`, `pnpm typecheck`, and `pnpm test` after recent workspace changes
- lockfile regeneration

## Immediate Checkpoint Before Phase 11/Execution Work

1. Deploy/redeploy the API with server-side BMONI sandbox variables and persistent storage.
2. Correct Phase 6 to the complete current React Native NGN KYC sequence.
3. Build/install the native BMONI development build on an arm64 phone.
4. Create/recover one Bunch Dillon sandbox user and keep that same local/BMONI mapping through the whole lifecycle.
5. Complete wallet owner proof and managed CNGN creation.
6. Complete KYC and confirm onboarding status reports NGN active.
7. Create/read the NGN virtual account where supported.
8. Request and confirm sandbox funding; request NGN 300,000 if preserving the canonical demo amounts.
9. Run `pnpm install`, `pnpm typecheck`, and `pnpm test`.
10. Only then continue into Human Approval → real bank destination → BMONI offramp/proposal execution.

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
- Uploaded/provider source conflicts are documented, not silently guessed around.
