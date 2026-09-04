# MONIFlow Project State

## Current Phase

Phase 4 — BMONI API Foundation

The Phase 4 API surface is implemented on `phase-4-bmoni-api-foundation`. MONIFlow now has a centralized sandbox-only BMONI client, documented user creation, SQLite `bmoniUserId` persistence, the canonical `POST /api/onboarding/user` route, and a private developer status surface for checking provider connectivity and stored user mapping without exposing credentials.

## Working

- Phase 1 pnpm workspace, Expo Router mobile app, Fastify API, and package boundaries
- Phase 2 semantic tokens, foundational components, bounded motion, and private design-system showcase
- Phase 3 static onboarding, tabs, Home operator, bank preview, and operator review journey
- Centralized server-side BMONI client with `x-api-key` authentication and sandbox-only host enforcement
- Strict Zod validation for documented BMONI user creation and provider responses
- Typed provider/configuration/transport/response errors with secret-safe logging
- SQLite local-user → BMONI-user mapping
- Canonical `POST /api/onboarding/user` endpoint; legacy `/onboarding/users` remains temporarily compatible
- `GET /api/dev/bmoni-status` safe developer endpoint
- `/_dev/bmoni-status` mobile developer screen showing only BMONI connectivity, sandbox environment, user-created state, and BMONI User ID
- Onboarding route tests updated to the canonical Phase 4 URL

## Not Yet Verified

- A real sandbox user has not been created from this execution environment because it cannot make outbound POST requests to BMONI and no local runtime with configured credentials is attached here.
- Therefore the Phase 4 checkpoint is code-complete but still requires one live sandbox execution: create an authorized test user, confirm the returned `bmoniUserId`, and reload the debug page to verify the persisted mapping.

## Not Yet Implemented

- BMONI React Native SDK, wallet provisioning, ownership, or device signing
- KYC or Nigeria onboarding flow
- Provider-backed wallet dashboard and balances
- Deterministic Intent Engine or LLM parsing
- Money Plan Engine and persisted plan state machine
- Complete deterministic MONI Guard rule engine
- Approval persistence, invalidation, or execution authorization
- Provider-backed bank discovery, verification, withdrawal, offramp, or proposals
- Provider-backed Activity or application persistence for Money Pockets
- GhostPay, TrustDrop, LifeWallet, analytics, or production payments

## Known Issues

- Native Android/iOS binaries are not compiled in this environment.
- BMONI documents no idempotency key for create-user; a timed-out request must not be blindly retried.
- The shared sandbox key documented by BMONI is suitable only for development and is never committed to this repository.
- This workspace could not run the pnpm verification commands because its container has no outbound DNS/network access to clone/install the repository. The changed files were contract-reviewed against the existing code and design tokens; local verification remains required before merge.

## Next Checkpoint

Run the API locally with sandbox configuration, then:

1. `POST /api/onboarding/user` with an authorized test identity.
2. Confirm the response contains a real `bmoniUserId`.
3. Open `/_dev/bmoni-status`, paste the same local user UUID, and confirm `BMONI API: Connected`, `Environment: sandbox`, `User: Created`, and the persisted BMONI User ID.
4. Run `pnpm typecheck`, `pnpm test`, and the normal workspace build before merging.

Do not begin Phase 5 wallet provisioning until this checkpoint passes.

## Environment Variables

- `NODE_ENV` — API environment
- `API_HOST` — API listen host
- `API_PORT` — API port, default `4000`
- `BMONI_BASE_URL` — API only; must be the confirmed sandbox origin
- `BMONI_API_KEY` — API only; never exposed to mobile
- `BMONI_REQUEST_TIMEOUT_MS` — API provider timeout
- `DATABASE_URL` — SQLite identity-mapping URL
- `EXPO_PUBLIC_API_URL` — public mobile-to-API URL; never contains secrets

## Architecture Decisions

- The BMONI API key remains server-side and is redacted from logs.
- Provider contracts live in the centralized BMONI service layer; mobile code never calls BMONI REST directly.
- User creation is idempotent only at the MONIFlow mapping layer: an already-mapped local user returns the persisted identifier instead of creating a second provider user.
- Provider failures are surfaced honestly; MONIFlow never substitutes a mock provider success.
- The developer page is informational only and cannot display secrets or perform financial execution.
