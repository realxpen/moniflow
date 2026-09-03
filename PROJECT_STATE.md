# MONIFlow Project State

## Current Phase

Phase 2 — BMONI Foundation

The sandbox REST foundation is implemented. Phase 2 remains intentionally limited to verified connectivity and user identity creation/mapping; it does not create wallets or execute money movement.

## Working

- Phase 1 pnpm workspace, Expo Router mobile shell, theme, UI foundations, Fastify API, and shared package boundaries
- Centralized API environment validation with a bounded BMONI timeout
- Sandbox-only BMONI configuration; production mode and production host are rejected
- Typed REST gateway using server-side `x-api-key`
- Strict Zod schemas for documented user creation, user response, error envelope, and supported currencies
- Typed configuration, transport, provider, and response-contract errors
- No automatic provider retries
- `GET /health` local API health
- `GET /health/bmoni` non-sensitive read-only connectivity check
- `POST /onboarding/users` documented BMONI user creation boundary
- SQLite local-user/email/`bmoniUserId` mapping with uniqueness constraints
- Existing mapping reuse and identity-conflict protection
- Sanitized error responses and credential/header log redaction
- Unit and route tests for the provider client, validation, persistence, mapping behavior, connectivity, and onboarding
- Verified HTTP `200` sandbox connectivity through the documented supported-currencies endpoint

## Not Yet Implemented

- BMONI React Native SDK
- wallet provisioning, ownership, or device signing
- KYC or Nigeria onboarding UI/flow
- bank discovery, verification, withdrawal, offramp, or proposals
- wallet/provider balance retrieval or transaction activity
- webhooks or reconciliation tooling
- natural-language parsing or real Intent Engine
- Money Plan Engine, approval state machine, or execution
- complete MONI Guard rule engine
- Activity or Money Pockets backed by real data
- GhostPay, TrustDrop, LifeWallet, analytics, or production payments

## Known Issues

- BMONI currently documents no idempotency key. A timed-out create-user request therefore has an unknown result and requires reconciliation; MONIFlow does not retry it.
- The shared sandbox key proves connectivity but is not a production credential. A project-specific key is required before production work.
- User creation is contract-tested locally but was not exercised against the live sandbox because no test identity was supplied or authorized.
- Native Android/iOS binaries are not compiled in this container because no emulator/Xcode toolchain is available; Phase 1 Metro and web-bundle validation remain the current mobile evidence.

## Next Phase

Phase 3 — Wallet Foundation

Before implementation, re-read the current BMONI lifecycle, React Native SDK, wallet-management, and security documentation. Define the device/backend ownership boundary, create an Expo development build path for the verified native SDK, and implement only documented sandbox wallet provisioning and retrieval. Do not add KYC, withdrawal, Money Plans, MONI Guard execution, or production access unless separately scoped.

## Environment Variables

- `NODE_ENV` — API environment
- `API_HOST` — API listen host
- `API_PORT` — API port, default `4000`
- `BMONI_BASE_URL` — API only; must be the confirmed development origin in the hackathon build
- `BMONI_API_KEY` — API only; secret and never exposed to mobile
- `BMONI_REQUEST_TIMEOUT_MS` — API provider timeout, default `10000`, maximum `30000`
- `DATABASE_URL` — SQLite identity-mapping URL
- `EXPO_PUBLIC_API_URL` — public mobile-to-API URL; never contains secrets

## Architecture Decisions

- BMONI REST access and partner credentials remain in `apps/api`; provider payloads do not leak into shared/mobile contracts.
- Phase 2 is locked to `https://embedded-dev.bmoni.com`; production is deliberately rejected.
- Read-only supported-currency discovery is the connectivity proof and does not imply financial readiness.
- User creation follows the documented `POST /v1/users` contract and persists the returned `bmoniUserId` against a local identity.
- Mutation retries are disabled because idempotency is undocumented and timeout outcomes are uncertain.
- SQLite is intentionally limited to the identity mapping needed by this phase.
- Mobile retains future wallet/private-key/device-signing responsibility; private keys never go to the backend.
- AI output can never call this provider boundary directly or bypass future Guard and human-approval controls.
- Provider success is accepted only after HTTP success and strict response validation.

## Demo Status

Target future instruction:

> Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.

The route journey remains a placeholder. Phase 2 adds provider connectivity and the initial user mapping only. No command is parsed, approved, signed, executed, settled, or presented as provider success.
