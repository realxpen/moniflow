# Phase 29 — Supabase sign-in + JWT-verified, read-only MONIFlow session

Date: 2026-10-16. Project: `realxpen/moniflow`. Status: code change prepared; production deployment and authenticated on-device verification remain separate gates.

## Implemented

1. Existing Supabase project **MONIFlow**, ID `rtcjismwbrvulccryyau`, is `ACTIVE_HEALTHY`. The API production environment already has `AUTH_ISSUER=https://rtcjismwbrvulccryyau.supabase.co/auth/v1`, the matching asymmetric `AUTH_JWKS_URL`, audience `authenticated`; private routes are verified with the issuer's public JWKS and signed JWT subject. Their presence in Vercel was read back; signing-algorithm compatibility of an actual issued user token remains to be verified.
2. Expo `apps/mobile/eas.json`'s **iOS Simulator preview profile only** now configures `EXPO_PUBLIC_SUPABASE_URL=https://rtcjismwbrvulccryyau.supabase.co` and its single active **modern `sb_publishable_` client key**, retrieved from the user's connected Supabase project. This key is designed to be exposed inside public client apps; it is NOT a service-role key, `sb_secret_` or token. Sensitive secrets, real user identities and wallet credentials were never fetched or committed. Before connecting any real data, ensure Supabase database policies and production auth settings are reviewed.
3. The existing password sign-in/signup remains explicitly user-initiated. It uses a bounded HTTPS Auth API, short-lived **memory-only** access/refresh tokens, serialized refreshes, and no persisted banking access token. After sign-in it now navigates to `/auth/session`, not directly to an unverified financial workspace. Email confirmation is still respected when Supabase requires it.
4. The new `GET /api/auth/session` Fastify endpoint is private by default under the existing production JWT middleware. It returns **only** the cryptographically verified subject and explicit `not_checked` mapping, wallet and KYC states, with `financialOperationsEnabled=false`. It sends `Cache-Control: no-store, private`. It never queries BMONI or any financial provider, persists data, provisions wallets, creates a user or sends funds. Without JWT middleware (local development), it fails closed with HTTP 401 rather than trusting unverified headers.
5. Native `/auth/session` verifies the server user ID equals the in-memory signed-in user, explicitly refuses inflated wallet/KYC readiness, allows a read-only manual recheck, and clearly supports sign-out. The Welcome screen's authenticated CTA links to this route. If the Vercel API hasn't deployed the new endpoint, the app reports **not deployed**, not a successful login/banking account.
6. Added server and client Vitest tests (anonymous, invalid, foreign-user ID, successful read-only proof, API not yet deployed, false provider status); root Node CI guards enforce the public key type and absence of privileged keys or financial mutations.

## Security and deployment gates

- **BMONI partner onboarding remains disabled**; the publicly displayed synthetic BMONI sandbox fixture ID is NOT linked to any signed-in user. Managed wallets, device signing, KYC and financial transfers remain unavailable. Sign-in proves identity to Supabase and our API; it does not prove ownership of a BMONI account.
- **Authenticated simulated financial ledger remains disabled** in production (`AUTHENTICATED_SANDBOX_DEMO_ENABLED=false` read back on 2026-10-16). It is separate from session verification and may not be enabled without the dedicated financial sandbox release gate.
- The backend must be deployed before users can receive a successful `/api/auth/session` response. CI passing and Expo compilation are NOT evidence that Vercel serves the new route or that signed-in API requests work on an iOS simulator.
- The preview EAS app must be rebuilt to bundle the public client config. The previous Appetize upload is unchanged. Request one new EAS build only after the API is verified and the user approves/initiates its cloud workflow; additional build time and third-party Appetize usage may have plan limits.
- **Safe acceptance test:** with a disposable, non-personal test account, sign up (and confirm email if required), sign in on the iOS simulator, verify the account's token is accepted by `/api/auth/session`, then sign out and confirm the route rejects unauthenticated requests. Verify bearer token and private IDs are never written to Appetize/GitHub screenshots/logs. Unrelated user IDs must return 403; do not send personal data to a third-party simulator.
- **No BMONI financial data** should be shown to a newly authenticated user with no verified owner-mapped provider identity, and the client should never infer that a local simulated balance represents an actual BMONI balance.
- The public Supabase publishable key is by definition embedded in a client bundle; database **RLS and API JWT verification**, not secrecy of this client key, must enforce access control. Confirm Supabase's active JWT signing algorithm is supported by backend verifier (ES256/RS256); legacy HS256-only tokens do not pass.

## Verified repository evidence to collect

- Typecheck, Expo web export, unit tests and disposable PostgreSQL CI.
- Exactly matching GitHub merged SHA and Vercel API production READY deployment SHA, flags still disabled.
- Unauthenticated `GET /api/auth/session` returns 401; `GET /health/provider` retains earlier safe connectivity behavior.
- Expo preview iOS Simulator build Succeeded and new Appetize instance uploaded, then disposable password sign-in and read-only session check. This is still a virtual iPhone, not proof of Secure Enclave owner signatures on a physical iPhone.
