# MONIFlow Project State

## Current Phase

Phase 6 — Nigeria Onboarding / KYC

Phase 6 is implemented on `main` as the Nigeria sandbox onboarding layer that follows the Phase 5 CNGN smart-wallet flow. MONIFlow now validates the sandbox identity, submits the matching KYC personal profile, starts BMONI Nigeria onboarding with the persisted CNGN wallet address and wallet index `0`, and reads provider onboarding status before presenting the user as ready.

## Working

- Phase 1 pnpm workspace, Expo Router mobile app, Fastify API, and package boundaries
- Phase 2 semantic tokens, foundational components, bounded motion, and private design-system showcase
- Phase 3 onboarding, tabs, Home operator, bank preview, and operator review journey
- Phase 4 centralized sandbox-only BMONI REST client, canonical user creation, SQLite `bmoniUserId` mapping, and safe developer status surface
- Phase 5 BMONI React Native signer integration, owner-proof challenge signing, managed CNGN wallet creation, and public wallet metadata persistence
- `GET /v1/users/{userId}/kyc/bvn-lookup/{bvn}` integrated server-side for Nigeria sandbox identity confirmation
- `PATCH /v1/users/{userId}/kyc` integrated for the matching Nigeria personal profile
- `POST /v1/users/{userId}/onboarding/start-nigeria` integrated with the persisted CNGN smart-wallet address and `ngnWalletIndex: 0`
- `GET /v1/users/{userId}/onboarding/status` integrated as the source of truth for Ready / Processing / Action required states
- MONIFlow routes: `POST /api/onboarding/nigeria/start` and `GET /api/onboarding/nigeria/status`
- Phase 6 mobile/web screen at `/onboarding/nigeria` with compact identity cards and progressive sandbox details
- Phase 5 wallet flow now continues into Nigeria onboarding rather than skipping directly to success
- API log redaction includes BVN and signing fields
- BVN is not persisted in the local wallet ownership table

## Security Boundary

- BMONI REST API key remains server-side only.
- Device private key is generated and retained by the BMONI native SDK secure-storage boundary.
- MONIFlow backend never receives or persists the private key or raw device PIN.
- BVN is accepted only for the provider onboarding request path and is redacted from Fastify request logs.
- The Nigeria route derives the smart-wallet address server-side from Phase 5 persistence rather than trusting a wallet address supplied by the client.
- MONIFlow does not mark Nigeria onboarding ready from a local flag; BMONI onboarding status is the authority.

## Sandbox Identity Rules

BMONI sandbox identity matching is deterministic. The Phase 6 UI defaults to one of BMONI's documented sandbox personas so the identity fields and BVN can resolve together. Do not substitute a real BVN or mismatched name/phone while using the development BMONI environment.

## Not Yet Verified

- The Phase 4 live BMONI user checkpoint still needs to be proven with the configured sandbox API deployment.
- The Phase 5 native owner-wallet checkpoint still needs one real iOS/Android development build run.
- The Phase 6 Nigeria onboarding checkpoint still needs a live BMONI sandbox run through `/api/onboarding/nigeria/start` and `/api/onboarding/nigeria/status`.
- The provider may return `action_required`; MONIFlow intentionally surfaces that state instead of pretending the rail is active.
- If the live sandbox status requires document uploads for this BMONI account, implement only those provider-requested documents as the next Phase 6 completion substep.
- Workspace typecheck/tests have not been run from this execution environment.

## Next Checkpoint

1. Deploy the MONIFlow API with server-side `BMONI_BASE_URL`, `BMONI_API_KEY`, and persistent `DATABASE_URL`.
2. Ensure the Phase 4 local user maps to the same documented BMONI sandbox persona used in Phase 6.
3. Complete the Phase 5 native CNGN wallet flow for that same `localUserId`.
4. Open `/onboarding/nigeria` and submit the matching sandbox identity.
5. Confirm BVN lookup succeeds, the KYC profile submission succeeds, and `start-nigeria` is accepted.
6. Check `GET /api/onboarding/nigeria/status?localUserId=...` until BMONI reports the required active/ready state.
7. If BMONI reports `action_required`, capture that provider response and implement only the specific missing requirement rather than expanding into the USD/EDD flow.

## Environment Variables

- `NODE_ENV` — API environment
- `API_HOST` — API listen host
- `API_PORT` — API port, default `4000`
- `BMONI_BASE_URL` — API only; sandbox origin
- `BMONI_API_KEY` — API only; never exposed to mobile
- `BMONI_REQUEST_TIMEOUT_MS` — API provider timeout
- `DATABASE_URL` — SQLite persistence URL
- `EXPO_PUBLIC_API_URL` — public mobile-to-API URL; never contains secrets
- `EXPO_PUBLIC_DEV_LOCAL_USER_ID` — optional development-only local UUID convenience for wallet and Nigeria onboarding

## Architecture Decisions

- Device ownership is proven cryptographically before Nigeria onboarding.
- Nigeria onboarding always uses the CNGN wallet persisted by Phase 5.
- The BMONI sandbox identity is checked before starting the Nigeria rail to make persona mismatches explicit.
- `ngnWalletIndex` follows BMONI's documented sandbox quickstart value of `0`.
- Provider failures and action-required states are surfaced honestly.
- Phase 6 does not implement the separate Nigeria-to-USD Enhanced Due Diligence flow.
