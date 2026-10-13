# MONIFlow ↔ Hustle — Signed receipt evidence v1

Status: NON-PRODUCTION proof-of-receipt readback only. No financial provider completion.

## Rationale
MONIFlow's sandbox partner API stores commands as durable RECEIVED operations, never executes them. Hustle must not infer that HTTP 202 or a command's RECEIVED state means a payout, refund, or collection succeeded. This readback proves **only that MONIFlow stored a canonical, partner-authenticated command**.

## Protocol
- Opt-in sandbox-only MONIFlow `GET /internal/v1/operations/:operationId/receipt-evidence` (same authenticated, nonce-replay-protected partner GET identity as other internal APIs).
- On authenticated read, look up the **persisted operation** under authenticated HUSTLE partner.
- Return exact JSON bytes for a strict `operation.received` receipt (not an execution status). Include partner, environment, canonical operation and event IDs, kind, amountMinor, NGN, original canonical command SHA-256 digest, stored createdAt, and fixed `simulated=true`, `executionStarted=false`, `realFundsMoved=false`, `providerEvidenceReference=null`.
- Sign **exact returned bytes** using HMAC-SHA256 over `MONIFLOW_SANDBOX_RECEIPT_V1\n` + raw UTF-8 bytes. Return `x-moniflow-receipt-signature: sha256=<lowercase-hex>`.
- Stable `eventId=moniflow.received:<operationId>`; a repeat read carries the same event and never changes wallet, ledger, provider or operation status. Consumers use a unique event ID plus immutable payload digest for idempotency.
- No webhook delivery or automated callbacks are created by this PR. Hustle may poll/read back in isolated tests; webhook/push outbox requires a later review.

## Release boundaries
This is **not** the `partnerFinancialEventSchema` financial settlement event. Real `SUCCEEDED`/`FAILED` status is unavailable; no keys, KYC, provider funds, custody or BMONI integration. Existing partner route registration remains OFF for NODE_ENV=production and when provider != moniflow-sandbox. No operator can create a signed financial-success event from this endpoint.

## Tests
Readback is auth-protected, bound to caller HMAC+nonce, per-partner, deterministic after command persistence and process restart; tampering with receipt bytes or signature fails independent HMAC verification. A missing operation is 404. Repeated reads do not trigger execution.
