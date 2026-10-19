# Phase 32 — Owner-scoped identity reconciliation readiness (2026-10-19)

## Scope of this PR

Adds a **read-only** authenticated `GET /api/workspace/reconciliation` endpoint and indexed-identity subject lookup in the existing local provisioning-hold repository. This is **not** provider reconciliation or an account-linking operation.

- Uses the verified JWT subject only; rejects mismatched `localUserId` and cross-account repository returns.
- Awaits database/schema readiness. Failures return 503 with an opaque random reference and allowlisted private logging; no raw SQL/connection error reaches clients.
- Reads the local mapping and subject-owned provisioning hold. A provider 409 or uncertain provider-create outcome remains on **manual review hold**, never automatically retried or linked.
- A persisted mapping means **recorded but unverified**, not proof of BMONI ownership.
- A missing mapping/hold means **identity evidence required**, NOT authorization to create or claim a BMONI user.
- The endpoint exposes only conservative status, verified local subject, and hard-coded false gates. It never returns provider ID, phone, email, fingerprint, account, wallet, KYC data, or balance.
- Legacy holds without a local user ID CANNOT be matched through this endpoint; the system must not infer their owner from a public sandbox fixture or an email supplied by a caller.
- No provider calls, no production or test financial writes, no new database schema or privileges, no secret changes, no Expo build and no deployment occur as part of this PR.

## Next independent acceptance gates

1. CI tests, static checks and disposable database evidence pass; review PR separately.
2. Fix/verify Phase 30's authenticated workspace 503 via a real Appetize account refresh and fresh Vercel logs. Unauthenticated `GET /api/workspace/overview` and `/reconciliation` must return 401 after deployment.
3. Deploy API and confirm owner-scoped `/reconciliation` is 200 with no mapping + no hold for a genuine new test account. Otherwise leave it blocked and diagnose.
4. Design approved evidence of **personal BMONI identity ownership** and uniqueness, privately reconcile legacy/synthetic fixtures, and prove there is no collision with another user. A user-held phone/email string or public BMONI sandbox persona is NOT sufficient.
5. Only with independent provider evidence, explicit permission and verified native device ownership proof may a later phase discuss sandbox account linking, wallet provisioning or live financial reads.

**Stop conditions:** Any storage 503, identity collision, unknown provider outcome, missing/rotated phone HMAC guard, unverified mapping, unmatched legacy hold, or missing provider ownership evidence blocks linking and all external money movement.
