# Phase B2 — BMONI identity recovery / no-repeat provisioning gate

Date: 2026-10-14
Status: **Local durable conflict hold implemented; BMONI existing-user recovery remains provider-blocked.**

## Reviewed authority
- MONIFlow B1 webhook-evidence PR #8 merged into `main` at `4a8b114b3cb82dcef549b46e668e5d08ff1f01f7`; its post-merge CI passed (run 38556613526).
- BMONI docs `https://embedded-docs.bmoni.com/api-reference/errors/` say `POST /v1/users` returning **409 User already exists** indicates the provider holds that email or phone and the integration must reuse the existing user rather than creating another.
- BMONI quickstart says to persist the genuine `bmoniUserId` returned by a successful `POST /v1/users`; it is **not** a local employee ID.
- Reviewed BMONI docs do not establish a safe partner-scoped, read-only existing-user lookup for MONIFlow's precise 409 sandbox scenario; the `employee.linked` webhook documented for employer invites has different authorization/identity semantics and is not proof of ownership of an existing MONIFlow personal-wallet user.
- Existing ONBOARDING route already returned non-retryable 409 or 503, but without durable quarantine a second request could still hit BMONI again.

## New durable safety behavior
1. Existing locally persisted user mapping is still returned immediately and not re-created. A different localUserId for the same mapped email fails closed.
2. Before any create attempt, look up `bmoni_user_provisioning_holds_v1` by normalized email in the same SQLite or PostgreSQL store. A hold means **no provider request**, regardless of restart or new browser session. Different localUserId for a held account is rejected.
3. After a verified provider `409`, persist `PROVIDER_USER_EXISTS`; after ambiguous transport errors, invalid successful-provider response, response identity mismatch or failed mapping persistence, persist `PROVIDER_OUTCOME_UNKNOWN`.
4. Holds store only normalized email, optional canonical local UUID, state, and creation timestamp. They never store BVN/NIN, API keys, password, provider error body or unverified BMONI user identifiers.
5. First provider failure still surfaces original safe HTTP error semantics. Later calls to the same email return `RECONCILIATION_REQUIRED` 409 or `OUTCOME_UNKNOWN` 503, `retryable:false`, **without** trying `POST /v1/users` again.
6. No automatic expiry/unblock or guessed API. Existing mapping and holds are separate resources: a hold is not a verified provider user mapping and must never authorize wallet access.
7. Manual unlock/recovery will require explicit BMONI support evidence and a separately reviewed scoped operator tool with unique identity matching, audit and authorization. This PR intentionally supplies no unblock or provider-user-ID assignment API.

## Remaining risk / future improvement
- Existing `createOrFindMapping` has no distributed pre-dispatch single-flight guard for **two genuinely simultaneous first-time requests**. An improved durable reserve-before-dispatch, with atomic claim before the network call, would be needed before any externally enabled BMONI partner creation workflow. For now BMONI registration remains locked outside isolated tests unless approved partner onboarding is enabled; do not enable it.
- A provider result could be committed while the local DB is unreachable; this is a general split-brain failure requiring provider-side idempotency or read-only recovery evidence. Do not blindly retry.
- Normal `FINANCIAL_PROVIDER=bmoni` integration remains gated by authorization flags. This branch does not change them, does not test a live BMONI endpoint and does not activate merchant payment support.

## Acceptance
- [ ] Typecheck, tests, lint, API build pass on exact PR head.
- [ ] First simulated provider 409 creates a permanent hold; repeat never invokes createUser again.
- [ ] Unknown transport, invalid response or failed local persistence create an OUTCOME_UNKNOWN hold.
- [ ] SQLite restart retains the hold. PostgreSQL implementation compiles and uses unique case-normalized email.
- [ ] User-local mapping remains reusable. Different localUserId cannot claim another identity or hold.
- [ ] No live BMONI calls, no new undocumented provider endpoint, no callback subscription and no real money.
