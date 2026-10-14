# B2 — Phone fingerprint key continuity gate

Date: 2026-10-14
Status: **test-only review milestone; no production enrollment, BMONI calls or real-money operations.**
Dependency: PR #11 merged at `c6230bd265a712057f75082ab9aa845c5d639a20`.

## Why this exists

A BMONI identity reservation stores a server-HMAC fingerprint of an E.164 phone number. Prior to this checkpoint, changing `BMONI_IDENTITY_PHONE_HMAC_SECRET` silently changed computed fingerprints. An existing registered/held phone could then be presented under a new email/local ID and bypass the old unique-index lock.

## Guard design

- A separate, domain-separated `phoneIdentityKeyGuard()` derives a 64-hex-character HMAC over a fixed public tag under the existing secret. The database stores **only the derived guard** in the private one-row table `bmoni_phone_key_guard_v1` (SQLite) or `moniflow_private.bmoni_phone_key_guard_v1` (PostgreSQL). Never store/log/read back the actual key or raw phone number.
- `BmoniUserService.createOrFindMapping()` validates the server key and calls `UserMappingRepository.assertPhoneKeyContinuity()` **before** examining existing identity mappings, provisioning holds or sending a provider request.
- First-ever initialization uses SQLite `BEGIN IMMEDIATE` or Postgres transactional advisory locking and inserts the marker atomically. Multiple processes sharing the same DB must use the same key; any later mismatch fails `BMONI_PHONE_KEY_CONTINUITY_MISMATCH` before network dispatch.
- **Legacy NO-GO:** if a DB contains any already-fingerprinted holds but has no continuity marker, refuse automatic marker adoption with `BMONI_PHONE_KEY_LEGACY_REVIEW_REQUIRED`. There is no way to infer the original HMAC key from stored fingerprints. Do not silently assume that the freshly supplied key is original.
- Historical holds without a fingerprint stay in place and remain scoped by email/local ID. A verified and reviewed separate migration is required before trusting historical phone-level protection.
- A missing/weak key still fails closed. Never choose a fallback test, deployment-generated or random secret, and do not automatically rotate the key. The guard is not a recovery key.

## Acceptance tests

- [ ] Cold-start SQL creates private marker schema, first check stores marker; repeat with original key succeeds, changed key fails; failed check leaves original marker intact.
- [ ] Two independent SQLite connections agree on the first key and reject a new one.
- [ ] Existing correctly mapped BMONI identity cannot be reused when the server key has changed, even after restart; new identity also cannot dispatch provider create.
- [ ] Existing fingerprinted holds with no marker fail closed and remain unchanged after reopen.
- [ ] Full MONIFlow typecheck, lint, test, API build/mobile web bundle CI green on exact reviewed PR commit.
- [ ] No provider-side identity recoveries, manually inferred user IDs, HMAC rotation, BMONI API calls, financial callbacks, production deploy or real funds.

## Operator instructions (for a later, separately approved partner onboarding)

1. Keep `BMONI_IDENTITY_PHONE_HMAC_SECRET` in a secret manager, stable across instances, restarts, deployments and database restores. Provision it only through approved partner access controls.
2. For `BMONI_PHONE_KEY_LEGACY_REVIEW_REQUIRED`, **do not wipe, rehash, unlock or recreate holds**. Record the original key-custody attestation or seek a separately reviewed, provider-supported identity reconciliation path.
3. For `BMONI_PHONE_KEY_CONTINUITY_MISMATCH`, check deployment secret version and rollback to the previously verified key. Do not attempt dual-key migration unless a reviewed migration can safely correlate authenticated phone ownership to existing reservations.
4. Restrict read access to the marker/hold tables and do not surface marker hashes in customer API responses or logs.
5. This guard only protects the **user-creation path**. `getMapping()` and downstream wallet/provider authorization need their own holistic identity and security review before live activation.
6. The initial marker transaction is only a local database assurance: it cannot prove the old BMONI account exists or that phone ownership, KYC, merchant collections, refund, payout or regulated custody are authorized.

## Remaining blockers

- BMONI existing-user `409` recoverability and appropriate provider-side read-only lookup remain unresolved.
- Provider-issued real webhook evidence, Nigerian merchant acquiring, third-party payout/refund and lawful escrow custody remain unverified.
- Legacy records lacking the original configured fingerprint key cannot be automatically migrated.
- Actual BMONI sandbox integrations still need partner approval and verified KYC/merchant scope.
