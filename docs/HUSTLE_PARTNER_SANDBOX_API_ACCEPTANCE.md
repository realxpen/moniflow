# MONIFlow × Hustle — Authenticated Sandbox Partner API

Date: 2026-10-13
Status: Implementation on stacked feature branch, awaiting CI/review.
Dependencies: MONIFlow PR #3 (sandbox v1 schemas) and Hustle merged PRs #107/#108.
**Scope:** authenticated, durable receipt of partner financial **commands only**. No money movement, no custody, no provider status claims.

## Availability and hard guardrails
The API does not register by default. Only **non-production** MONIFlow with all conditions may enable it:
- `NODE_ENV` is `development` or `test`
- `FINANCIAL_PROVIDER=moniflow-sandbox`
- `PARTNER_HUSTLE_SANDBOX_ENABLED=true`
- `PARTNER_HUSTLE_HMAC_SECRET` has at least 32 characters and is managed only as a backend secret.

If production or BMONI mode, routes are never registered regardless of switch. No real PSP adapter is referenced by the partner routes. Existing consumer/mobile Money Plan and wallet flows are unchanged.

## Internal endpoint contract (not a BMONI API)
- `POST /internal/v1/collections` — persisted only, never confirmed paid
- `POST /internal/v1/payouts` — persisted only, no transfer, reservation evidence not yet verified
- `POST /internal/v1/refunds` — persisted only, no refund, authorization evidence not yet verified
- `GET /internal/v1/operations/:operationId` — authenticated tenant-scoped read
- `GET /internal/v1/provider-capabilities` — explicit disabled execution flags

All POST commands must conform to `@moniflow/shared` strict sandbox v1 schemas. Only `HUSTLE` partner is supported. An accepted receipt has status `RECEIVED`, `simulated=true`, `executionStarted=false`, `realFundsMoved=false`, and `providerEvidenceReference=null`. HTTP 202 is **not** a financial-provider acknowledgment. No success/paid/funded event is emitted from this API.

## Service-to-service authentication
The request must include:
- `x-moniflow-partner: HUSTLE`
- `x-moniflow-timestamp`: epoch milliseconds, at most five minutes skew
- `x-moniflow-nonce`: unique UUID for this request
- `x-moniflow-signature: sha256=<HMAC hex>`

The HMAC (constant-time comparison) covers UTF-8 canonical string:
`UPPERCASE_METHOD + "\\n" + EXACT_REQUEST_PATH + "\\n" + TIMESTAMP + "\\n" + NONCE + "\\n" + SHA256(EXACT_RAW_BODY_BYTES)`.
For POST, content type MUST be `application/vnd.moniflow.partner+json`; parser retains original raw bytes. A replay nonce is inserted atomically and durably under the resolved authenticated partner, and a second use is rejected. Clock-based skew tolerance is not a license to reuse nonces. The HMAC secret stays backend-only.

## Persistence and idempotency
Sandbox operation store has SQLite (including restart persistence) and PostgreSQL implementations; both persist tenant/operation ID + tenant/idempotency key uniqueness, canonical validated command, immutable SHA-256 terms digest and RECEIVED status. An identical command with a NEW signed nonce returns duplicate receipt (200). Reused operation ID or key with changed amount/subject/destination is a 409 conflict. Financial provider calls are **absent**. Repeated requests cannot change or execute a financial state.

## Threats / controls validated
- No secret or disabled flag → no partner routes.
- Missing/wrong HMAC, wrong partner, stale timestamp, tampered signed payload → rejected.
- Duplicate nonce across app restart → 409 replay.
- Amount 0, float, wrong currency, production environment in body, injected provider-success flag → 400.
- Same operation/key with divergent monetary terms → 409.
- Authenticated read does not return sensitive user identifiers or raw command body.
- Payout/refund commands are received as **unverified intent** and never touch BMONI.
- Production deployment and live provider activation remain NO-GO.

## Important limitations — next phases
1. No trusted issuer verification for `hustleReservationReference` and `hustleRefundAuthorizationReference`, so neither can trigger a provider.
2. No executed payment, signed normalized callback, webhook outbox, provider evidence, merchant checkout, settlement or real reconciliation.
3. HMAC identity is scoped to one partner and sandbox; before production introduce credential rotation, multi-tenant key management, external auth tests, request size and rate limits, anomaly monitoring, nonce retention policy, and separate workload identity if applicable.
4. SQLite/Postgres operation persistence is implemented; deployment schema review, concurrency fault injection and Postgres-backed CI integration are still required before calling the storage system production-ready.
5. BMONI's sandbox 409 user-mapping and real KYC, signing, collection/refund/custody gaps remain unresolved.

No auto merge, production deploy, provider credentials, PII, bank transfers or customer fund movements are authorized by this PR.
