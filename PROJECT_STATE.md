# MONIFlow Project State

## Current Phase

Phase 5 — Device Wallet + Ownership

Phase 5 is code-complete on `phase-5-device-wallet-ownership`. The mobile app now integrates the actual BMONI React Native signer SDK for secure on-device wallet provisioning and EIP-191 challenge signing. The API requests BMONI owner-proof challenges, creates managed CNGN smart wallets after successful ownership proof, and persists only public ownership/wallet metadata.

## Working

- Phase 1 pnpm workspace, Expo Router mobile app, Fastify API, and package boundaries
- Phase 2 semantic tokens, foundational components, bounded motion, and private design-system showcase
- Phase 3 onboarding, tabs, Home operator, bank preview, and operator review journey
- Phase 4 centralized sandbox-only BMONI REST client, canonical user creation, SQLite `bmoniUserId` mapping, and safe developer status surface
- Actual `@bkey-inc/bmoni_embedded_sdk` integrated into mobile
- Device wallet load/provision flow using BMONI SDK secure storage
- Six-digit SDK PIN gate for device signing
- `POST /api/wallet/owner-proof-challenge`
- EIP-191 challenge signing on-device; raw private key never crosses the device boundary
- `POST /api/wallet/create-managed` for managed CNGN smart-wallet creation
- SQLite persistence of device owner address, BMONI smart-wallet ID, smart-wallet address, currency, and timestamps only
- API log redaction for signature-bearing request fields
- `GET /api/wallet/status` for safe persisted wallet metadata lookup
- Frosted/blurred provisioning UI matching the Phase 5 moodboard direction and showing Device wallet → Ownership → CNGN Wallet → Nigerian rail progress
- Android Expo config plugin adds Bkey Maven repository and arm64-v8a requirement for the BMONI native signer

## Security Boundary

- BMONI REST API key remains server-side only.
- Device private key is generated and retained by the BMONI native SDK secure-storage boundary.
- MONIFlow backend never receives or persists the private key or raw device PIN.
- Mobile sends only owner address, BMONI challenge signature, challenge identifier, and local identity context required for provisioning.
- Signature request fields are redacted from Fastify logs.

## Not Yet Verified

- A real Phase 4 BMONI sandbox user has not been created from this execution environment.
- The Phase 5 native checkpoint has not been executed on a physical/emulated arm64 iOS/Android development build with live BMONI sandbox credentials.
- Therefore wallet existence and provider-side ownership proof are implemented but must still be proven with one live device run.
- This execution environment cannot run the workspace install/typecheck/test cycle because outbound package/network access is unavailable.
- `pnpm-lock.yaml` still requires regeneration after adding the BMONI SDK/config-plugin dependencies; run `pnpm install` in a networked development environment before using `--frozen-lockfile`.

## Not Yet Implemented

- Nigerian fiat rail activation after the CNGN smart wallet
- KYC/Nigeria onboarding completion
- Provider-backed wallet dashboard and balances
- Deterministic Intent Engine or LLM parsing
- Money Plan Engine and persisted plan state machine
- Complete deterministic MONI Guard rule engine
- Approval persistence, invalidation, or execution authorization
- Provider-backed bank discovery, verification, withdrawal, offramp, or proposals
- Provider-backed Activity or application persistence for Money Pockets
- GhostPay, TrustDrop, LifeWallet, analytics, or production payments

## Next Checkpoint

In a networked local environment:

1. Run `pnpm install` to refresh `pnpm-lock.yaml`, then `pnpm typecheck`, `pnpm test`, and the workspace build.
2. Configure API-only BMONI sandbox credentials and create/confirm the Phase 4 BMONI user.
3. Build the mobile app as an iOS/Android development client; Expo Go is not sufficient for the native BMONI SDK.
4. Open `/onboarding/wallet`, provide the mapped local user UUID, and create/load the device wallet.
5. Confirm Device wallet ✓ and Ownership ✓ after the SDK signs BMONI's owner-proof challenge.
6. Confirm CNGN Wallet ✓ and verify `GET /api/wallet/status` returns the same owner address, BMONI smart-wallet ID, and smart-wallet address.
7. Restart the app and confirm `walletAddress()` returns the same device owner address.

## Environment Variables

- `NODE_ENV` — API environment
- `API_HOST` — API listen host
- `API_PORT` — API port, default `4000`
- `BMONI_BASE_URL` — API only; sandbox origin
- `BMONI_API_KEY` — API only; never exposed to mobile
- `BMONI_REQUEST_TIMEOUT_MS` — API provider timeout
- `DATABASE_URL` — SQLite persistence URL
- `EXPO_PUBLIC_API_URL` — public mobile-to-API URL; never contains secrets
- `EXPO_PUBLIC_DEV_LOCAL_USER_ID` — optional development-only local UUID convenience for the provisioning screen

## Architecture Decisions

- Device ownership is proven cryptographically using the exact owner address produced by the BMONI React Native SDK and an EIP-191 signature over BMONI's challenge message.
- Managed CNGN wallet creation occurs only after the backend receives the signed owner-proof challenge.
- The backend persists public wallet identity, never key material.
- Provider failures are surfaced honestly; MONIFlow never substitutes mock wallet success.
- Phase 6 must not treat the Nigerian rail as active until BMONI/provider-backed rail provisioning is verified.
