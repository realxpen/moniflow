# Phase 33A — Android identity-review preflight (2026-10-19)

## Purpose

Close the gap between Phase 32's authenticated `GET /api/workspace/reconciliation` endpoint and a visible, truthful native Android Profile experience. This is a **read-only preflight**, not the later physical-device BMONI wallet ownership proof itself.

## Android feature

- New `apps/mobile/services/account-reconciliation.ts` GET client runs only after the existing personal workspace snapshot has been strictly verified and only when Profile is displayed.
- The request never passes the user ID, email, phone or provider ID as a query or body field; the server binds it to the verified JWT.
- Validate exact authenticated subject, mapping consistency with the prior workspace response, all allowable reconciliation enums, `identityEvidence=not_collected` and three disabled flags. Unsupported or inflated provider claims fail closed.
- Recheck the active signed-in subject after the response. Sign-out/account switch discards stale results.
- Distinguish **EVIDENCE NEEDED**, **UNVERIFIED** (recorded mapping only), and **MANUAL REVIEW** (provider 409/unknown create outcome hold). All states explicitly prohibit automatic pairing and money movement.
- Old API 404, service 503, unexpected payload/content-type and network problems show a conservative **NOT VERIFIED** panel; a valid workspace overview can still be shown independently. Only syntactically valid UUIDv4 support references are surfaced, never raw database or provider details.
- Change native workspace footer from simulator-only wording to neutral physical-device wording.
- No SDK wallet access, signing, KYC collection, provider accounts, balances, transactions, database mutations or private identity payloads.

## Evidence and release gates

1. GitHub CI must pass TypeScript, native web export regression, Vitest and disposable PostgreSQL suite.
2. After review/merge, a **separate** production API deployment is required to make Phase 32 `/api/workspace/reconciliation` available. Verify `/health/provider` still reports disabled financial flags and anonymous `/api/workspace/reconciliation` remains 401.
3. Run read-only authenticated Profile smoke testing against a disposable account. Any unexpected provider mapping, unresolved hold, 503 or cross-account response blocks identity operations.
4. The user's already-installed physical Android APK has the previous compiled JavaScript. The new Profile panel requires **another explicitly approved** standalone Android APK build, finished Expo Gradle compilation and separate installation. Code merge and API release alone do not update the installed APK.
5. Phase 33B owner proof remains a separate future milestone requiring provider-authorized private sandbox identity evidence and a native device challenge/proof design. Device private keys and wallet PINs remain on-device; no real money or KYC data goes into a public workflow.

## Observed production incident resolution

On 2026-10-19 the user's physical Android sign-in yielded `/api/auth/session` HTTP 200 but `/api/workspace/overview` HTTP 503 with sanitized `schema_ready / DATABASE_AUTHENTICATION` diagnostics. The owner corrected the private connection; subsequent Vercel logs showed successful authenticated `/api/workspace/overview` HTTP 200, confirming live database-read recovery. The exact password/URI was neither inspected nor copied. The production alias still pointed at API Phase 30 SHA `9e55f61` at PR preparation. This historical state must be rechecked before release.
