# BMONI Integration Boundary

## Status

The BMONI API foundation was implemented ahead of its planned Phase 4 checkpoint. It does not provision wallets, perform KYC, create withdrawal proposals, sign transactions, or move money.

The current official [BMONI documentation](https://bkey.mintlify.app/) and development OpenAPI document were reviewed on 2026-09-03. They remain the final source of truth; endpoint and SDK behavior must never be implemented from memory.

## Confirmed environment and authentication

- Development origin: `https://embedded-dev.bmoni.com`
- Partner REST authentication: `x-api-key` on each request
- Interactive development reference: `https://embedded-dev.bmoni.com/docs`
- OpenAPI document: `https://embedded-dev.bmoni.com/docs/openapi.json`
- `BMONI_BASE_URL` must contain the origin only, with no `/v1` path.

The current client deliberately accepts only the confirmed HTTPS development hostname and refuses to initialize in `NODE_ENV=production`. Production configuration is out of scope. `BMONI_API_KEY` is read by `apps/api` and must never enter mobile code, an `EXPO_PUBLIC_*` variable, logs, or a committed file.

## Implemented boundary

`apps/api/src/services/bmoni` owns:

- sandbox configuration enforcement;
- the `x-api-key` REST client;
- documented error-envelope handling;
- strict Zod request and response contracts;
- request timeouts and typed configuration, transport, provider, and contract errors;
- a gateway interface for deterministic testing;
- documented user creation through `POST /v1/users`;
- read-only connectivity through `GET /v1/smart-wallets/supported-currencies`.

The client does not retry automatically. BMONI does not currently document idempotency keys, and a timed-out mutation has an unknown outcome. The user-creation service first checks the local identity mapping, persists successful `bmoniUserId` mappings in SQLite, and fails closed on conflicts. A provider `409` requires reconciliation rather than another create call.

## MONIFlow API routes

- `GET /health` — local service health; never contacts BMONI.
- `GET /health/bmoni` — non-sensitive, read-only sandbox connectivity proof.
- `POST /onboarding/users` — validates a documented create-user request and returns only the local/BMONI identity mapping.

The onboarding route does not fabricate success. Transport uncertainty, an undocumented provider response, missing configuration, and identity conflicts return explicit failures.

## Responsibility boundary

### Backend

The API owns partner credentials, REST access, provider contract validation, user mapping, orchestration, and later policy enforcement. Logs contain request identifiers and error categories only—not API keys or provider response bodies.

### Mobile device

The mobile app will own secure wallet actions, explicit authorization UX, and device signing when the verified React Native SDK flow requires it. Private wallet keys must never be sent to the MONIFlow backend.

### Shared contracts

Provider payloads stay inside the API integration boundary. Only stable MONIFlow contracts belong in `packages/shared`.

## Deferred

- BMONI React Native SDK installation or configuration
- wallet provisioning and ownership
- KYC
- bank discovery or verification
- withdrawal/offramp proposals
- proposal signing or execution
- balances, transaction activity, webhooks, and production access

See [`BMONI_CAPABILITY_MAP.md`](BMONI_CAPABILITY_MAP.md) for the verification record and phase boundary.
