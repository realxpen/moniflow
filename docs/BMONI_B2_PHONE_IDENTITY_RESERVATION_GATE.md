# B2 extension — Privacy-conscious phone identity reservation

Date: 2026-10-14. **Review-only and sandbox-first**. Based on merged PR #10 at `995c14d6f78bd288cf2580a7ea5490a1e9d0bdba`.

## Threat and prior state
PR #10 already protects concurrent `POST /v1/users` against equal normalized email and equal local user UUID by making an atomic durable reservation before any BMONI network call. BMONI may also reject an identity sharing a **phone number** with an existing user. Different emails and local account IDs could circumvent the earlier local reservation.

## Implementation
1. Validate the user-provided phone already required by BMONI's onboarding schema as E.164.
2. Compute a **keyed HMAC-SHA256** fingerprint with `BMONI_IDENTITY_PHONE_HMAC_SECRET` (minimum 32 characters) over the exact normalized E.164 value, under the domain `MONIFLOW_BMONI_PHONE_LOCK_V1\n`. Use one stable private server-only key in every API instance sharing a database.
3. Store **only the fingerprint**, never another plaintext phone number, in `moniflow_private.bmoni_user_provisioning_holds_v1` or its SQLite equivalent. These are internal, non-user-facing reconciliation locks.
4. Add a unique partial index on `phone_fingerprint IS NOT NULL` in both SQLite and PostgreSQL, in addition to existing unique email/local user ID. The database, not an in-memory mutex, chooses the single winner before the provider create call.
5. When a previously persisted successful mapping carries a fingerprinted hold, verify the incoming phone matches before returning a reusable BMONI identity. A different phone cannot silently reuse the provider ID.
6. Different email/local user ID with the same phone is rejected without sending a provider request. The first identity's reservation survives uncertain outcomes, restarts, and successful mapping storage. An upstream 409 still refines state to `PROVIDER_USER_EXISTS`.
7. The server refuses all **new** BMONI registration if the stable phone HMAC secret is absent. There is no insecure default, static production salt, raw SHA256, or provider call to infer an identity.
8. Deployments with pre-PR holds use additive migrations. **Historical rows have NULL phone_fingerprint** and remain held by their original email/local UUID. Their phone values cannot be inferred; a historical 409 and phone alias require approved provider recovery, not guessing.

## Test gates
- [ ] Source `phone-identity-fingerprint.test.ts`: correct E.164, consistent fingerprint, different-key variation, absent-secret refusal.
- [ ] Two independent SQLite connections with **different emails but the same phone** permit only one mocked provider create call even under active concurrency.
- [ ] A second user with the same phone is rejected after restart and after the original mapping succeeded.
- [ ] Existing mapped email with different phone fails closed.
- [ ] Additive schema migration retains legacy rows, leaves fingerprint NULL, and enforces phone unique index for all new rows.
- [ ] Exact-head typecheck, test, lint, mobile export and API CI passes.
- [ ] No actual BMONI requests, secrets, real identities, financial provider callbacks, customer money, ledger changes or production deployment.

## Security and operational caveats
- **Fingerprint != anonymization.** Phone numbers are low-entropy, so an exposed HMAC key still enables enumeration. Keep the key in server secrets, grant DB access minimally, do not log or expose phone fingerprints, and avoid customer-facing reads of holds.
- **Key stability and rotation:** changing the fingerprint key breaks matching existing reservations. Maintain the same key across restarts and deployments. Rotation requires planned dual-key lookup or reviewed migration of authoritative phone inputs, not a silent variable change.
- **Existing historical successful users:** old mapping/hold rows without a fingerprint cannot be retroactively protected by phone uniqueness. Provider support must authorize any recovery.
- **Phone ownership/verification:** a fingerprint only detects identical phone strings. It does not establish that the caller owns that phone, nor handle number recycling or separate formatting aliases. KYC/phone ownership remains provider-owned.
- **No reopening:** holds still have no automatic unlock, expiration or provider-id recovery. Production BMONI partner registration remains separately gated by approved entitlement.
- **Real BMONI supported merchant acquiring, refunds, payouts and escrow remain unverified.** This is a preflight identity safety improvement, not financial activation.
