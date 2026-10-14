# B2 extension — Reserve BMONI identity before external creation

Date: 2026-10-14. Code review only; no live BMONI calls.
Depends on merged MONIFlow PR #9, commit `9fbe6e7f72b5a8d52d9da3e1347ee9a1914d89ad`.

## Threat

The previous durable hold in PR #9 was written **after** a provider conflict/unknown outcome. Two requests reaching a new email concurrently could both pass the initial mapping/hold read and both submit a state-changing `POST /v1/users`. That violates the no-blind-retry goal.

## Solution

- `UserMappingRepository.reserveBeforeCreate()` writes a durable hold **before** the provider is called. It returns `true` only for the single INSERT winner; concurrent requests cannot both win.
- Both SQLite and PostgreSQL enforce **unique case-normalized email** and **unique non-null localUserId**. The reservation is committed atomically with normal SQL constraints; no in-memory mutex.
- Reserve `PROVIDER_OUTCOME_UNKNOWN` proactively. This state means no provider outcome is yet known; even a crash before dispatch cannot be distinguished safely from a call that was made and lost.
- A different email attempting to reserve the same local UUID fails without contacting BMONI. A different local UUID attempting to reserve the same email also fails.
- After a provider `409`, `markProviderUserExists()` refines the durable state to `PROVIDER_USER_EXISTS`. All other provider failures or unexpected identities leave `PROVIDER_OUTCOME_UNKNOWN`, including apparent validation failures: only a human with independent provider evidence can release the hold.
- A successful provider response saves the authoritative `bmoniUserId` mapping; later requests use the mapping before reading the reservation. The hold remains as an audit trail: no delete, automatic expiration, or unverified replay of `POST /users`.
- If local mapping persistence fails **after** the provider creates the user, reservation is already durable. There is no window where a successful remote create is unprotected from retry.

## Tests / acceptance

- [ ] Exact-head TypeScript, lint, unit tests and mobile export CI passes.
- [ ] Two different SQLite connections issuing simultaneous requests for one email call the provider mock exactly once; the losing request receives manual-reconciliation hold; successful mapping is reusable afterward.
- [ ] Two different emails with the same local UUID are rejected before the second provider call.
- [ ] Persisted pre-dispatch hold prevents a create even after process crash/restart.
- [ ] `409` transitions reservation from unknown to exists; timeout/malformed response remains unknown; neither retries automatically.
- [ ] Prior onboarding API tests still return 409 or 503 safely with `retryable:false`.
- [ ] No real BMONI sandbox provider operation, customer funds, production deployment, manual unlock API or undocumented BMONI identity lookup introduced.

## Known limitations / next evidence

- This prevents duplicate **MONIFlow** dispatches for the same email/local identity in a shared configured database. It cannot prevent a separate partner, manual BMONI dashboard user creation, or identity collision by another email/phone alias (phone uniqueness is NOT enforced by the local reservation). A future review should require documented provider-side idempotency or partner-scoped lookup and validated phone/identity controls.
- Reservation is intentionally conservative: an accepted but invalid request or an interrupted pre-send process remains held until manual review. We favor avoiding extra provider-created accounts over automatic retry convenience.
- It is only valid when all instances use the same authoritative SQLite file or shared Postgres database. `:memory:` tests, separate devices, and independent SQLite files do not coordinate a reservation.
- Proper provider-side recovery of a historical 409 remains **blocked** until BMONI supplies an authorized existing-user lookup or identity-reconciliation procedure. No real provider webhook subscription or payment/escrow capability has been verified.
