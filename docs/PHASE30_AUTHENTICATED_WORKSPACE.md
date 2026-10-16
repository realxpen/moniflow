# Phase 30 — Authenticated financial workspace and BMONI account readiness

Date: 2026-10-16. Native verification evidence: the owner signed in with a disposable account on Appetize and received **API SESSION VERIFIED** on the Phase29 iOS Simulator build. That proves Supabase-issued JWT → MONIFlow API user subject matching; it does NOT prove a BMONI identity mapping, KYC, wallet ownership or money movement.

## Implementation

- Added protected, no-store `GET /api/workspace/overview`. Uses **only** the verified request-scoped JWT subject (no input `localUserId`), and reads the existing MONIFlow database's subject-bound BMONI mapping and wallet ownership *records*. It never calls BMONI, contacts a bank, reads balances, fetches transactions or creates users/wallets. Mapping and ownership rows returned for a foreign subject fail with HTTP 403. Database outages fail with HTTP 503 (never become fictitious empty-state success).
- Response fields have deliberately conservative semantics: `mapping=not_linked|recorded`, `wallet=not_created|recorded_not_reverified`, `kyc=not_checked`, `providerReadAccess=false`, `financialOperationsEnabled=false`, `accountData=withheld_until_verified`. No BMONI ID, wallet address, email, bank or funds ever leave the server through this endpoint. `recorded` is **NOT** independent BMONI provider confirmation.
- Implemented strict native `loadAccountWorkspace()` which calls that GET only after a Supabase session is present, verifies the response subject, enumerated states and financial gates, and discards results if the signed-in account changes while the request is in progress.
- Production Home, Pockets, Activity and Profile now render a shared signed-in workspace screen. This shows honest per-account readiness states, safe pending/empty panels, refresh and sign-out. It does not present zero balances as real, read saved banking details, fetch historical transactions, or use the offline example ledger. Old tab logic is accessible only in `__DEV__` for isolated development, not in installable production-mode Expo preview builds.
- Native signed-session verification now offers **Open your read-only workspace** only after the API verifies the signed-in user. Existing tab navigation remains authenticated.
- Added API Vitest tests for anonymous/token failures, foreign workspace IDs, mapping/wallet mismatches, local empty identity, DB outages, and absence of financial data. Mobile tests cover GET-only behavior, session changes, rejection of inflated wallet/KYC responses and unsupported API versions. Root Node regression checks enforce that all four production tabs use the signed overview and new API route is read-only.

## Crucial limits and provider gates

The BMONI synthetic sandbox user created via a **public GitHub action** has no authenticated MONIFlow mapping and must not be silently attached to the user's authenticated account. An authenticated Supabase session is not evidence of possession of that provider account.

The current database may have no BMONI mapping or owned wallet for a newly signed-in account. The correct display is **Not linked / Not ready / withheld**, not a simulated balance or a guessed provider ID.

Real balances and transaction history must **not** be fetched or shown until we have evidence for all of:
1. Owner-bound MONIFlow subject ↔ BMONI user mapping under a private, partner-authorized sandbox identity.
2. A provider-managed wallet owned through validated device EIP-191 owner proof, with protected signing on a physical device and a private verification record.
3. Provider-approved KYC and explicit read permissions. A local wallet record is not sufficient to establish these conditions.
4. A read-only provider endpoint whose authorization is bound server-side to that subject, with fail-closed handling, account-switch cleanup, cross-user 403s and zero fallback to demo ledger values.

Do not submit BVN/NIN, real phone numbers, wallet PINs or private keys through Appetize (third-party simulator), a public GitHub workflow or this conversation. The BMONI feature flags for public onboarding and authenticated money simulation remain disabled.

## Acceptance and deployment

- First validate PR CI: TypeScript, Expo web export, Vitest/unit/security and disposable PostgreSQL tests. Merge only when green.
- A **separate production API deployment** is required before the new `/api/workspace/overview` URL exists on `moniflow-api-silk.vercel.app`. Confirm the exact commit SHA and that both financial feature flags remain disabled; test anonymous `GET` returns 401.
- A **new Expo iOS Simulator build** and updated Appetize upload are needed to test new native tabs. They are not created by merging the PR. Avoid duplicate builds or Appetize quota usage until the API is ready and explicit build approval is given.
- Test using a disposable, non-personal Supabase account. Verified session → Open read-only workspace → tabs Home/Pockets/Activity/Profile → observe honest no-mapping/no-wallet statuses → sign out. Attempting a foreign account query or spoofed JWT must be rejected. No financial writes or provider calls should be observed.
