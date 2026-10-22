# MONIFlow × Figma × Hustle — unified demo and provider adapter readiness

Status: **source-only development, not a production release**. Exact design reference: [MONIFlow Figma](https://www.figma.com/design/Ir1EG2ui7qVhVuSrYoU917), especially **06 · Home** (`3:126`) and the financial workspace series. Reuses the React Native app's warm-ivory, lilac, charcoal, editorial headings, rounded cards and established four-tab navigation. All values and actions below are examples, not customer finance.

## Product modes (deliberately separate)

| Mode | Visible UX | Source of money/status | May move money? |
| --- | --- | --- | --- |
| **Real account · read-only** | Existing authenticated Home, Pockets, Activity, Profile and independent readiness status | Authenticated user-scoped API account/readiness GETs; no assumed personal balance | NO |
| **Explore interactive demo** | Figma-aligned Home, Pockets, Activity with shared example balance, command review and example ledger | Fixed volatile `offline-pocket-ledger` data owned by the **current signed-in user**, never by BMONI | NO |
| **Hustle partner sandbox** | HMAC-authenticated server-to-server control plane with operation receipts | Durable MONIFlow DB commands and signed `RECEIVED` evidence only | NO |
| **Future BMONI connected** | Same product shell, after verified identity, wallet, rail, bank and ownership gates | Authoritative per-user provider evidence via backend only | BLOCKED, until separately approved |

The signed-in UI's **Explore the interactive Figma demo · example funds** control opts in. A persistent top-of-screen `SIMULATED DATA · NO REAL PAYMENTS` status and `Exit demo` return immediately to the true read-only account state; no demo number is substituted into real account data. Home, Pockets and Activity share only in-memory simulated state across tab changes. Profile stays the real account/provider readiness authority. Demo actions include two quick examples, a limited natural-language teaching parser with review, explicit simulation, local Pocket allocation/release and simulated Activity. No third-party bank number, real API, wallet, auth token, AsyncStorage or receipt is used. An account change or sign-out discards the previous owner's preview state; an unrecognized/overspending instruction cannot partially update the demo ledger.

## Integration architecture: Hustle first, others by separate onboarding

**Existing, implemented MONIFlow API:** `/internal/v1/collections`, `/internal/v1/payouts`, `/internal/v1/refunds`, `/internal/v1/operations/:operationId`, `/internal/v1/operations/:operationId/receipt-evidence`, and `/internal/v1/provider-capabilities`.

**Existing, implemented Hustle backend:** `apps/api/src/payment/moniflow-sandbox-partner.client.ts`. It signs exact request bytes using HMAC-SHA256; operates in `NODE_ENV=test` on `127.0.0.1` only; translates an actual persisted `HUSTLE_SANDBOX` PaymentAttempt or reserved financial operation, not an arbitrary client amount; validates immutable receipt terms. The Hustle payment/escrow ledger remains the sole authority for Hustle domain transitions.

### Safe local test topology (only in isolated CI or dev environments)

```
Hustle web checkout (illustrative)
    |
    v
Hustle authenticated backend + real persisted sandbox PaymentAttempt
    |  HMAC-signed, backend-only command; no API key in browser
    v
MONIFlow sandbox partner API -> durable RECEIVED operation
    |  read-only signed receipt and idempotency status
    v
Hustle backend verifies receipt -> records test observation only
    |
    +-> UI says "Payment test received / settlement not confirmed"
```

**The returned `202 RECEIVED` means only that MONIFlow stored the command.** It does not mean paid, funded, refunded, sent, escrowed or settled. No provider execution happens. A future checkout UI must show `AWAITING_VERIFIED_PAYMENT` (or an equivalent domain-safe pending state), not `PAID`, upon this acknowledgment.

### Non-production MONIFlow API opt-in

The existing sandbox partner routes register **only** when all conditions hold on a private backend:
- `NODE_ENV=test` or `development`
- `FINANCIAL_PROVIDER=moniflow-sandbox`
- `PARTNER_HUSTLE_SANDBOX_ENABLED=true`
- `PARTNER_HUSTLE_HMAC_SECRET` set with a dedicated random secret of 32+ characters, provided through **both backends' private test secret managers**
- A disposable SQLite/PostgreSQL database and an isolated network with authorized service-to-service access.

The secret is NEVER shipped to Expo, the Hustle browser, public repo, logs, screenshots or chat. Do not turn on these flags in production. The existing Hustle signed client restricts the destination to **loopback 127.0.0.1 and `NODE_ENV=test`**. Thus this path is ready for **local and CI integration testing**, not a publicly deployed web-app checkout. Web checkout integration needs a separate, authenticated staging environment, credentials/rotation, rate limits, reconciliation, hosted-URL egress policy and review of Hustle's financial transitions.

### Suggested CI smoke checks across both repositories

Use existing tests/fixture wiring, not fresh real identities: send a signed Hustle COLLECTION for a persisted sandbox PaymentAttempt; verify MONIFlow returns `RECEIVED` with `realFundsMoved:false`; repeated identical operation is idempotent, tampered/forged HMAC fails, conflicting amount/destination fails, expired nonce fails; signed receipt must be independently verified by Hustle. Assert **no Hustle order/payment/escrow status becomes paid or settled solely from receipt**. The existing receipt outbox sender, if invoked in tests, permits only loopback and stores observations, never settles.

New partners must each have independently scoped credentials, identity, per-partner stores and authorization rules; simply passing a new `partner` string in JSON is not access. Current v1 accepts **HUSTLE only**.

## BMONI credentials and physical-device readiness

The current API has an existing `BmoniClient` and backend-only configuration seam: `BMONI_BASE_URL`, `BMONI_API_KEY`, `FINANCIAL_PROVIDER=bmoni`. Real user enrollment/KYC is default-off behind `BMONI_PARTNER_ONBOARDING_ENABLED=false`. An API key alone must **not** flip this gate.

When BMONI supplies an approved *dedicated* credential via a secure partner channel:
1. Privately verify allowed sandbox base URL, scopes and account/merchant rights; set backend-only secrets and verify their absence from Expo web/native bundles.
2. Confirm documented existing-user lookup/recovery for 409 holds, Nigeria KYC response envelopes and onboarding sequence. Do not guess IDs or submit another persona.
3. Test a read-only provider capability/status call in an isolated backend with sanitized logs. Mere HTTP 200 does not establish a wallet, identity, settlement, marketplace escrow or payout rights.
4. On a physical supported **ARM64** device, verify owner key continuity and EIP-191 challenge flow with a test wallet only if explicitly authorized.
5. Introduce provider-backed money operations through separately reviewed transactions, idempotency, explicit human approval, cross-plan reservations and evidence reconciliation. Never infer settlement from signed command intake or a provider proposal.
6. Keep Hustle merchant collections, buyer refunds, payout custody and escrow *disabled* until BMONI or another licensed PSP expressly confirms those Nigerian capabilities and commercial authorization.

Known external blockers are tracked in issue #70 (provider permission, identity recovery and KYC) and issue #62 (physical Android evidence). Per owner instruction, no further developer-support emails are being sent.

## Acceptance / safety

- A demo remains opt-in, visually marked as simulated, fully reversible and reset on account change.
- No simulated amount ever appears in real account balances; real Home/Pockets/Activity remain unavailable where unverified.
- A mobile app cannot hold an HMAC partner secret or trigger a partner sandbox action by itself.
- No BMONI API request, real money, custody, KYC, signup, production deploy, EAS APK or test-token operation is triggered by this PR.
- GitHub CI checks TypeScript, Vitest, Expo web export and PostgreSQL, but a native UI screenshot review requires a separately approved new APK built from the exact merged commit.
