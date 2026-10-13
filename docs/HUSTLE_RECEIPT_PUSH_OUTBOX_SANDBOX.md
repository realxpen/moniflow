# Hustle partner received-only delivery queue — Sandbox

Date: 2026-10-13. Review-only. Not a live finance provider.

## Purpose
After authenticating and storing a Hustle COLLECTION/PAYOUT/REFUND command, MONIFlow can form an immutable HMAC-signed `operation.received` event. This branch adds a durable, lease-based delivery queue and an explicitly invoked single-event sender. It never claims merchant funds, bank transfers, refunds, escrow or provider execution.

## Durable recovery
- SQLite or PostgreSQL backing database stores original partner command.
- Receipt outbox is persisted under a unique `(partner, operation_id)`.
- The sender first backfills any missing outbox rows from committed operations, so a crash before queue insertion cannot permanently drop a receipt.
- Atomic claim with 30-second lease and incremented attempt count; missed HTTP acknowledgments can be redelivered at least once after lease expiration.
- A failed attempt waits at least 1 second and stops at eight attempts (`DEAD`), requiring manual inspection rather than infinite delivery storms.
- Successful Hustle response must confirm canonical operation/event ID, `RECEIVED` and no funds/financial mutation. Only then mark DELIVERED.
- Repeating a receipt is harmless only because Hustle checks signature, source financial terms and immutable event ID/receipt digest before persisting one observation.
- No background worker starts with the MONIFlow API, and no production target/config exists.

## Security
- `deliverOneSandboxReceipt` requires `NODE_ENV=test`, a 32+ byte HMAC secret, and exactly `http://127.0.0.1:<port>/api/v1/payments/partner-sandbox/received`. No external domain, redirect, other path, bank account, callback URL chosen by a client, or BMONI endpoint permitted.
- Source event serialized using the existing strict MONIFlow receipt event schema with `eventType=operation.received`, fixed `status=RECEIVED`, `simulated=true`, `executionStarted=false`, `realFundsMoved=false`.
- No provider status/financial success event emission. The old authenticated GET readback remains unchanged.

## Acceptance
- Isolated outbox tests cover crash/rebuild, lease expiry, retry delay and unsafe target rejection.
- End-to-end pinned two-repo CI must verify failed HMAC delivery stays pending, later correctly signed retry stores exactly one Hustle observation and ledger/Order/payment state remains unchanged.
- No provider execution, production deployment or cross-user access. Provider evidence, webhook origin protection, real custody/KYC and operational delivery scheduling are separate future approvals.
