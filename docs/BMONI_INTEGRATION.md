# BMONI Integration Boundary

## Status

BMONI integration begins in Phase 2. Phase 1 contains no BMONI endpoint, REST call, SDK method, payload, response type, provider mock, or fabricated success state.

## Source of truth

The final source of truth is the current official BMONI documentation: [https://bkey.mintlify.app/](https://bkey.mintlify.app/).

No endpoint or React Native SDK method may be implemented from memory alone. Before every BMONI integration change, inspect the current documentation/OpenAPI and record confirmed capability, environment, authentication, request, response, error, proposal, signing, and status behavior.

## Responsibility boundary

### Server-side REST client

`apps/api/src/services/bmoni` will own BMONI REST access. `BMONI_API_KEY` and every application credential remain on the backend. The server must redact credentials and sensitive headers from logs.

### Mobile device

`apps/mobile` will own device-side wallet responsibility, secure wallet actions, explicit authorization UX, and device signing where the documented SDK requires it. Private wallet keys must never be sent to the MONIFlow backend.

### Shared contracts

Only validated MONIFlow contracts belong in `packages/shared`. Provider payloads must not leak across boundaries without an explicit mapping layer.

## Environment boundary

The hackathon uses BMONI sandbox only. Sandbox and production configuration, records, logs, and claims must remain visibly separate. A sandbox result must never be presented as production money movement.

## Integration gate for Phase 2

Before coding:

1. Re-read the current BMONI documentation/OpenAPI.
2. Confirm the official sandbox base URL and authentication scheme.
3. Confirm required user-creation fields and actual response shape.
4. Confirm error, idempotency, rate-limit, and status behavior.
5. Add strict Zod validation at the provider boundary.
6. Add a non-sensitive connectivity check and test failure behavior.
7. Update this document and `PROJECT_STATE.md` with evidence-based decisions.

No fake integration may be substituted when provider connectivity fails.
