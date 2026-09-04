# MONIFlow Project State

## Current Phase

Phase 7 — Wallet Dashboard and Balance

Phase 7 is implemented on `main` as the provider-backed wallet home layer. MONIFlow now reads the managed CNGN wallet, BMONI account balances, and the NGN deposit account where the Nigeria rail has issued one. Home no longer uses the Phase 3 hardcoded wallet balance.

## Working

- Phase 1 pnpm workspace, Expo Router mobile app, Fastify API, and package boundaries
- Phase 2 semantic tokens, foundational components, bounded motion, and private design-system showcase
- Phase 3 onboarding, tabs, Home operator, bank preview, and operator review journey
- Phase 4 centralized sandbox-only BMONI REST client, canonical user creation, SQLite `bmoniUserId` mapping, and safe developer status surface
- Phase 5 BMONI React Native signer integration, owner-proof challenge signing, managed CNGN wallet creation, and public wallet metadata persistence
- Phase 6 Nigeria sandbox identity/KYC submission, Nigeria onboarding start, and provider onboarding status checks
- BMONI wallet-home endpoints integrated server-side:
  - `GET /v1/users/{userId}/smart-wallets/account/wallets`
  - `GET /v1/users/{userId}/smart-wallets/account/balances`
  - `GET /v1/users/{userId}/smart-wallets/{smartWalletId}`
  - `GET /v1/users/{userId}/bank-accounts/deposit-accounts/NGN`
- MONIFlow routes:
  - `GET /api/wallet?localUserId=...`
  - `GET /api/wallet/balance?localUserId=...`
  - `GET /api/wallet/deposit-account?localUserId=...`
- Home reads provider-backed CNGN wallet state and available balance instead of `mockHomeData.availableBalance`
- Home shows a compact CNGN wallet row with a shortened wallet address and provider status
- Full wallet address and BMONI smart-wallet ID live behind `/wallet/details`
- Add Money shows the NGN virtual account only when BMONI returns one; unsupported/not-yet-issued accounts do not block wallet/balance loading
- Nigeria onboarding passes the sandbox `localUserId` through success into Home, so the provider wallet can load without requiring an extra manual environment value after onboarding
- Existing non-wallet Phase 3 demo sections such as suggestions, pockets, and activity remain explicitly mock/demo content

## Security Boundary

- BMONI REST API key remains server-side only.
- Device private key is generated and retained by the BMONI native SDK secure-storage boundary.
- MONIFlow backend never receives or persists the private key or raw device PIN.
- BVN is accepted only for the provider onboarding request path and is redacted from Fastify request logs.
- Wallet dashboard endpoints take the local MONIFlow user UUID, resolve the persisted BMONI user mapping server-side, and derive the persisted managed-wallet identifier server-side.
- The mobile app receives only wallet state, public wallet address, provider wallet ID, balance, and deposit-account details required for display.

## Provider Source of Truth

BMONI's documented wallet-home flow is the authority for Phase 7. The integration uses the account wallet/balance endpoints and the NGN deposit-account endpoint documented for an active Nigeria rail. MONIFlow does not synthesize a fake virtual account when the provider does not return one.

## Not Yet Verified

- The Phase 4 live BMONI user checkpoint still needs to be proven with the configured sandbox API deployment.
- The Phase 5 native owner-wallet checkpoint still needs one real iOS/Android development build run.
- The Phase 6 Nigeria onboarding checkpoint still needs a live BMONI sandbox run.
- The Phase 7 wallet/balance/deposit-account checkpoint still needs a live provider-backed run against that same sandbox user.
- Exact provider response envelopes for wallet/balance/deposit-account are normalized defensively because the public lifecycle docs define the endpoints but the live response shape still needs to be observed in MONIFlow's sandbox account.
- Workspace install/typecheck/tests have not been executed from this chat environment.

## Next Checkpoint

1. Deploy the MONIFlow API with server-side `BMONI_BASE_URL`, `BMONI_API_KEY`, and persistent `DATABASE_URL`.
2. Confirm the same `localUserId` has a Phase 4 BMONI user mapping and Phase 5 managed CNGN wallet.
3. Complete Phase 6 until BMONI reports the Nigeria rail active/ready.
4. Call `GET /api/wallet?localUserId=...` and confirm the returned wallet address and ID match the Phase 5 managed wallet.
5. Call `GET /api/wallet/balance?localUserId=...` and confirm the CNGN amount matches the BMONI sandbox balance.
6. Call `GET /api/wallet/deposit-account?localUserId=...`; if the Nigeria rail issued a virtual account, confirm account number/bank details match BMONI. A provider 404 remains an honest unavailable state.
7. Open Home and confirm the displayed amount, CNGN status, shortened address, wallet detail view, and Add Money virtual account all come from the provider-backed routes.

## Environment Variables

- `NODE_ENV` — API environment
- `API_HOST` — API listen host
- `API_PORT` — API port, default `4000`
- `BMONI_BASE_URL` — API only; sandbox origin
- `BMONI_API_KEY` — API only; never exposed to mobile
- `BMONI_REQUEST_TIMEOUT_MS` — API provider timeout
- `DATABASE_URL` — SQLite persistence URL
- `EXPO_PUBLIC_API_URL` — public mobile-to-API URL; never contains secrets
- `EXPO_PUBLIC_DEV_LOCAL_USER_ID` — optional development-only fallback local UUID; Phase 7 can also receive the UUID from the onboarding route

## Architecture Decisions

- Home displays money-facing state; blockchain/provider identifiers remain behind the wallet details screen.
- Provider balance is never replaced with a hardcoded fallback amount.
- NGN virtual-account availability is optional and does not block wallet or balance rendering.
- Wallet lookups resolve BMONI identity and wallet identifiers server-side from MONIFlow persistence.
- Phase 7 does not implement withdrawals, transfers, swaps, or proposal signing; those remain later phases.
