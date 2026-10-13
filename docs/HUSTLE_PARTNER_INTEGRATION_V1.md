# Hustle × MONIFlow — Partner Financial Integration v1
Date: 2026-10-13
Status: PHASE 00 PROPOSAL — sandbox contract only; NO live integration or money movement.
Counterpart: Hustle `Knowledge/Decisions/ADR-0069-moniflow-financial-integration-boundary.md`.

## Goal and non-goals
Build a partner financial execution API for Hustle without changing MONIFlow's independent, hackathon-focused personal Money Plan workflow. MONIFlow remains a wallet/intent and provider-operation coordinator. It is NOT assigned marketplace escrow authority, customer fund custody, merchant acquiring, regulatory status, or the right to mark a Hustle Booking FUNDED / Order PAID.

## Sources actually inspected
- `AGENTS.md`, `PROJECT_STATE.md`, `docs/MONIFLOW_PRODUCT_SOURCE.md`
- `apps/api/src/create-app.ts`, `apps/api/src/routes/operator.ts`, `apps/api/src/routes/execution.ts`, `apps/api/src/routes/wallet.ts`
- `apps/api/src/services/financial-provider/provider.ts`, `apps/api/src/services/bmoni/gateway.ts`, `docs/BMONI_INTEGRATION.md`
- Hustle `apps/api/src/payment/payment-gateway.port.ts`, `financial-operation.port.ts`, `payment.service.ts`, `financial-operations.service.ts`, `wallet.service.ts`

## Authority boundary
- Hustle owns Booking/Order amounts, payer, beneficiary, payment attempts, append-only balanced ledger, escrow/settlement eligibility, wallet available/pending/escrow/reserved projections and payout/refund authorization.
- MONIFlow owns provider interaction attempts, signed provider evidence (subject to independent verification), human/device signing orchestration and *execution* states.
- Custody, actual bank money and external settlement are owned by an appropriately authorized provider under a separately approved arrangement.
- MONIFlow Pockets do not map to Hustle escrow, and CNGN provider balances must not be presented as NGN custodial escrow.
- Only server-side authenticated Hustle adapter may call proposed partner commands. Existing `/api/operator` routes using caller-controlled `localUserId` are NOT a safe partner boundary.

## Versioned contracts
`packages/shared/src/partner-contracts.ts` exports strict Zod schemas for command and normalized event messages. First version supports sandbox NGN minor-unit amounts only; it defines no BMONI REST endpoint and does not create a MONIFlow HTTP route.
Proposed (NOT implemented): `POST /internal/v1/collections`, `GET /internal/v1/collections/:id`, `POST /internal/v1/payouts`, `GET /internal/v1/payouts/:id`, `POST /internal/v1/refunds`, `GET /internal/v1/refunds/:id`, `GET /internal/v1/reconciliation`, `GET /internal/v1/provider-capabilities`.

Command must include version, partner, environment, operationId, idempotencyKey, subject/operation reference, integer amountMinor, NGN currency. A payout additionally carries a verified destination *reference* and Hustle reservation reference; a refund carries the persisted Hustle authorization reference. **These fields are evidence pointers, not authorization:** partner service must verify them against a trusted issuer, current Hustle transaction state, and bound partner identity before starting provider execution.

Normalized events must be signed with rotating dedicated partner credentials. Validate exact raw bytes, timestamp/freshness, eventId deduplication, tenant and operation binding, matching monetary terms and provider evidence. No event alone automatically marks money settled: the receiving Hustle adapter must independently reconcile status/evidence.

## Idempotency and authorization
- Service-to-service identity: initially mutually authenticated workload identities or short-lived signed service JWT with audience, tenant, scopes and key rotation; do not accept partner name from body as authentication.
- No cross-tenant lookups, caller-chosen end-user UUID permissions, private key transmission, embedded provider secrets in the mobile bundle, or finance approval via LLM text.
- Accept duplicate identical operation commands, reject same key with different amount/destination/subject. Use persistent uniqueness and records, not in-memory Maps.
- External execution follows durable command reservation/authorization commit, then outbox dispatch; an uncertain timeout stays UNKNOWN/PENDING until verified. Never blind retry a non-idempotent provider operation.
- Provider events get a durable inbox before acknowledgement. Responses are sanitized; PII, bank numbers, BVN/NIN, signatures and secret keys never appear in partner events.

## Provider reality and blockers
Most recent MONIFlow `PROJECT_STATE.md`: BMONI live path blocked because existing Nigerian sandbox personas returned 409 without recoverable `bmoniUserId`. The `moniflow-sandbox` provider is an explicit simulation. The native BMONI device signing flow and provider-backed KYC/withdrawal have not been end-to-end accepted.
BMONI docs describe NGN virtual accounts, wallets and offramps, not a verified Hustle-compatible per-Order merchant checkout, refund rail, legal marketplace escrow/custody, or Web signature mechanism. Do not infer those capabilities or fabricate success.

## Phase gates
00: Architecture/ownership, contracts, risk and blocked-source audit.
01: Partner auth, persistent operation/idempotency, signed event delivery, deny-by-default API.
02: Disposable-DB simulated collection/payout/refund integration with Hustle using actual domain services.
03: Provider-supported BMONI sandbox evidence once user identity/KYC/rail blocks clear.
04: Merchant PSP fallback for unsupported collections, cross-provider reconciliation, UX, settlement pilot.
05: Separate regulatory/contractual risk gate, controlled production rollout only with explicit human approval.

## Required failure tests
Cross-tenant ownership denial; forged callback; replay and amount/currency mismatch; caller-selected UUID; no verified evidence; duplicate provider event; simultaneous payout; provider success after internal DB failure; timeout with UNKNOWN; blocked refund during payout; unfunded escrow; held-funds overcommit; no source data leakage.

## Current gate
No MONIFlow production integration may be turned on from this PR. Internal typecheck/tests only. Do not create customer financial records or call BMONI.
