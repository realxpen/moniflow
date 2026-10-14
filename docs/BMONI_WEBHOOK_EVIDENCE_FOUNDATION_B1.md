# Phase B1 — BMONI Webhook Evidence Foundation

Date: 2026-10-14
Status: **TEST-ONLY SOURCE-FORMAT VALIDATION. NOT LIVE BMONI INTEGRATION.**
Official source: https://embedded-docs.bmoni.com/api-reference/webhooks/

## Scope and source-supported protocol

Current BMONI Embedded webhook documentation describes:

- A **partner-scoped** subscription (configured with partnerId) receives `employee.deposit.completed`, `employee.deposit.failed`, `employee.deposit.refunded`, `employee.withdrawal.processing`, `employee.withdrawal.completed`, `employee.withdrawal.failed`; global legacy `wallet.*` events are NOT partner-scoped and must not be subscribed to.
- Event body: `{id, eventType, payload, timestamp}`. Header `X-Webhook-Id` must match the stable body `id`; `X-Source-Event-Id` may be empty for old deliveries.
- `X-Webhook-Signature` is a **lowercase unprefixed hex HMAC-SHA256** of the **exact raw request body** keyed by the secret string `secretKey`. This repo uses the official Node example's UTF-8 string-key semantics; do not reinterpret it as hex-decoded key bytes without an explicit provider protocol change.
- Secret issued on subscription is a **64-character hexadecimal** string; do NOT commit a real subscription secret.
- A `2xx` acknowledges delivery; `5xx` (or 408/429) is retryable; most other `4xx` permanently fail. Never return a permanent 4xx for an infrastructure outage.
- Event `id` is stable across retries; durable deduplication is required. BMONI currently has no on-demand synthetic webhook test trigger, so this PR uses only **locally manufactured fixture bytes**, not a provider event.

## What is implemented

- `BMONI_WEBHOOK_EVIDENCE_TEST_ENABLED` and `BMONI_WEBHOOK_EVIDENCE_TEST_SECRET` are **off by default**, and route creation requires `NODE_ENV=test` and `FINANCIAL_PROVIDER=moniflow-sandbox`. The test route is `POST /internal/test-only/bmoni-webhook-evidence/received`.
- Fastify encapsulated JSON parser preserves the raw `Buffer` (64 KiB max). Constant-time comparison of raw-body HMAC and exact event/header ID matching precedes any persistence.
- Six documented partner-scoped `employee.*` money events are accepted; unknown and legacy `wallet.*` events fail closed. Payload is inspected only as an object, **not interpreted as payment/escrow success**.
- `SqliteBmoniEvidenceStore` and `PostgresBmoniEvidenceStore` store ONLY stable event ID, type, optional source event ID, SHA-256 raw body digest, occurrence/observation timestamps and `TEST_OBSERVATION`. They do NOT store raw payload/identity/recipient details, mutate money state or call a provider.
- Identical repeat events return `duplicate=true`; conflicting same-ID contents return 409. A database error yields 503 so that the provider would retry in a later separately approved live environment.
- No endpoint is subscribed with BMONI, no BMONI network calls, no external webhook URL, keys, real identities, payment gateway status changes, Hustle Order status, real transfer, refunds, legal custody or production deployment.

## QA acceptance criteria

- [ ] MONIFlow typecheck, tests, lint, API build green on final branch head.
- [ ] Valid documented raw-body signature and header ID accepted once; exact duplicate accepted with immutable observation ID.
- [ ] Forged/missing signature, changed JSON bytes, header ID mismatch, unexpected event and legacy wallet.* names rejected without storage.
- [ ] Same ID with different authentic-looking data rejected as a conflict; evidence table has no raw payload column.
- [ ] SQLite close/reopen retains replay identity; Postgres adapter compiles.
- [ ] Test-only route remains 404 in normal MONIFlow app without opt-in; no customer-visible routes or real BMONI calls.
- [ ] Observations always answer `providerSettlementConfirmed=false` and never update Hustle's financial ledger.

## Next independent checkpoints

1. Resolve the prior `409` BMONI user identity mapping with BMONI support; recover a supported `bmoniUserId` without guesswork.
2. Obtain an actual, **partner-scoped** webhook subscription and real secret under authorized sandbox terms, with rotating key procedure; do not create it from this PR.
3. Verify an **actual sandbox provider** event, documented payload semantics and partner/user scoping, then implement a distinct **read-only** adapter with independent provider status inquiry. Distinguish wallet deposit from a Hustle Booking/Order payment.
4. Only with signed provider evidence and verified legal merchant/custody arrangements consider an explicitly approved provider/financial state adapter. Real-money execution is separate.

## Safety reminder

A correctly signed webhook proves it was produced by the configured signing-key holder. It does not automatically prove marketplace merchant authority, per-Order collection, escrow custody, refund eligibility or seller payout. The B1 test key is disposable and is never proof of BMONI origin.
