# MONIFlow public API security and release gate

## Current security model (October 2026)

Production financial API routes require a **signed Supabase Auth user JWT**. The server:
- Verifies JWT signature against the project-configured **HTTPS JWKS URL** (RS256 or ES256, not HS256).
- Checks issuer, audience (default `authenticated`), role, expiry, and subject UUID.
- Compares every top-level `localUserId` from request body/query/path to the authenticated JWT subject and rejects mismatches (`403`).
- Binds `POST /api/onboarding/user` and `/api/onboarding/users` to that subject instead of accepting an arbitrary new local UUID.
- Denies all routes except `/health`, `/health/provider`, and `/health/bmoni` by default. The **`/internal/v1`** partner sandbox namespace retains its separate HMAC, nonce, and replay protection.
- Fails closed (`503 AUTH_NOT_CONFIGURED`) if production auth verifier settings are missing; no hard-coded token, public bypass, or production demo override is accepted.
- Does not trust a browser CORS allowlist as authorization.

The app renews near-expiry Supabase access tokens through a serialized refresh request while the app remains open. No financial mutation is automatically replayed after a refresh or authorization failure. Refresh tokens are memory-only and are cleared on sign-out; a full browser reload still requires sign-in.\n\nThe app uses Supabase email/password sign-in and attaches bearer tokens only to the configured MONIFlow API origin. Both access and refresh tokens are **memory-only**: refreshing the website or restarting the app requires signing in again. The existing Zustand demo-session store continues to persist only non-secret flow metadata, not tokens.

**Important:** local `NODE_ENV=development` flows are still for isolated development; do not publish a development-mode API. Real BMONI financial movement remains subject to its own Guard, approval, provider proposal, and device-signing checks. Auth is an additional access boundary, not a substitute for them.

## Supabase project

Existing project: `MONIFlow` (`rtcjismwbrvulccryyau`). Its REST URL is `https://rtcjismwbrvulccryyau.supabase.co`. Auth, database health, and JWT signing configuration must be checked after project restoration. Public/project references are safe to commit; never commit a Supabase secret key, service-role key, DB password, or BMONI API key.

In the Supabase Dashboard:
1. Confirm the MONIFlow project is **ACTIVE_HEALTHY**.
2. Under **Project Settings → JWT Keys**, verify that a signing key with an asymmetric algorithm (ES256 or RS256) is active. A legacy HS256-only project is not compatible with MONIFlow's safe public JWKS verifier; migrate it via Supabase's official signing-key instructions instead of sharing the JWT secret with the API.
3. Confirm email/password sign-in is enabled and establish the intended email-confirmation settings and auth email delivery.
4. Test signup/email confirmation/password login with a **test identity**; never use real BVN/NIN for BMONI sandbox.

Supabase docs: https://supabase.com/docs/guides/auth/signing-keys

## Vercel production variables — already provisioned

Project `moniflow` (web):
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase public project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — only the **publishable** API key, never the secret key
- `EXPO_PUBLIC_API_URL` — MONIFlow API production domain

Project `moniflow-api` (API):
- `AUTH_ISSUER` — `https://rtcjismwbrvulccryyau.supabase.co/auth/v1`
- `AUTH_JWKS_URL` — the matching public signing-key endpoint
- `AUTH_AUDIENCE` — `authenticated`
- Existing `BMONI_API_KEY` and `DATABASE_URL` remain restricted to the API and are unchanged.

After any Vercel variable changes, create a **new deliberate release**; earlier deployments do not necessarily receive new build-time environment values.

## Don't remove Vercel protection until this checklist passes

1. GitHub CI green for the final authentication code commit.
2. Supabase project healthy, asymmetric signing key active, test account authenticated.
3. Review effective Vercel API `NODE_ENV=production` and JWT issuer/JWKS settings.
4. Run manual GitHub Actions release **Deploy MONIFlow to Vercel**, `main`, `both`. Keep Vercel Authentication in place during this step.
5. Check `/health` and `/health/provider` through the protected deployment (or using Vercel-authorized testing). No user wallet data or bank changes should be exposed without a JWT.
6. In a controlled test, verify `401` for no session and `403` when token A requests user B's `localUserId` on balance/plan/approval; valid signed same-user access succeeds.
7. Only then set Vercel Authentication for the API project to **Preview deployments only**. This exposes public health endpoints, but every protected financial route still requires a verified session.
8. Confirm the public website can fetch `/health/provider`, sign in, and access only its own workspace. Observe logs for `AUTH_NOT_CONFIGURED`, `INVALID_SESSION`, `WORKSPACE_ACCESS_DENIED`, and provider errors.

**Never** disable the auth hook to resolve a `401`/`403`, expose `NODE_ENV=development` in production, or put service-role or JWT signing secrets in `EXPO_PUBLIC_*`. Roll back protection changes immediately if financial endpoints become accessible unauthenticated.

## Still required before public financial operations

- A real-device BMONI SDK signer test and BMONI sandbox user reconciliation remain separate blockers.
- Consider persistent secure sessions, signup abuse protection/rate limits, account recovery, monitoring/alerts and a formal authorization review before broad public onboarding.
- GitHub CI success proves typecheck, web bundling and automated tests, **not** a live end-to-end production sign-in or settlement.


## Recovery hardening (Phase 18)

- The persisted mobile checkpoint stores **only** `localUserId`, provider ID, workflow stage,
  persisted plan ID and timestamp. Raw money instructions, Supabase tokens, PINs and
  signatures are not persisted.
- Legacy v1 checkpoints are sanitized at hydration: old `command` fields are discarded,
  and invalid saved provider, user ID, stage and plan ID fields are ignored.
- When signed in on production, a route-supplied or saved workspace ID must match
  the authenticated account before Home loads its balances or offers recovery.
- A valid plan checkpoint is resumed **only after a deliberate tap**. The server
  remains authoritative for plan ownership, MONI Guard, authorization and execution.
- If parsing stopped before a persisted plan was returned, an app restart does
  **not replay** the saved instruction or submit a fresh plan silently.
  Users must clear that checkpoint and re-enter the instruction.
- This does not replace provider status checking or true BMONI device-signature
  verification. The simulated Operator is separately isolated under `/demo/operator`.
