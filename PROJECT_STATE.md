# MONIFlow Project State

## Current Phase

Phase 3 — Shell and Navigation

The complete static mobile product shell is implemented and browser-verified. Onboarding, the four-tab workspace, the Home operator, the bank preview, and the operator review journey can be navigated without contacting BMONI.

## Working

- Phase 1 pnpm workspace, Expo Router mobile app, Fastify API, and package boundaries
- Phase 2 semantic tokens, foundational components, bounded motion, and private design-system showcase
- Static onboarding journey: Welcome → Identity → Wallet → Setup preview
- Floating text-based bottom navigation: Home, Pockets, Activity, and Profile
- Modular Home composition with greeting, mock available balance, add/withdraw actions, embedded MONIFlow Operator, suggestions, money spaces, and recent activity
- Static bank journey: Select → Verify → Destination preview
- Static operator journey: Processing → Money Plan → Consequence review → Device boundary → Honest result
- Clearly labeled mock balances, destinations, allocations, checks, and activity
- Explicit consequence review that cannot call BMONI or authorize money movement
- Result state that reports `No money moved` and never fabricates provider success
- Browser-verified input, modal, tab, onboarding, bank, and operator navigation
- Typecheck, lint, tests, workspace build, Expo web export, API startup, and `/health`

The server-side BMONI API foundation was implemented ahead of the agreed Phase 4 sequence and remains preserved. It includes sandbox-only configuration, typed REST access, strict Zod contracts, connectivity, documented user creation, SQLite identity mapping, typed errors, and tests.

## Not Yet Implemented

- Phase 4 live sandbox user-creation checkpoint with an authorized test identity
- BMONI React Native SDK, wallet provisioning, ownership, or device signing
- KYC or Nigeria onboarding flow
- Provider-backed wallet dashboard and balances
- Deterministic Intent Engine or LLM parsing
- Money Plan Engine and persisted plan state machine
- Complete deterministic MONI Guard rule engine
- Approval persistence, invalidation, or execution authorization
- Provider-backed bank discovery, verification, withdrawal, offramp, or proposals
- Provider-backed Activity or application persistence for Money Pockets
- GhostPay, TrustDrop, LifeWallet, analytics, or production payments

## Known Issues

- The editorial type role uses the platform sans font. A licensed bundled editorial family may be evaluated during Phase 17.
- Native Android/iOS binaries were not compiled in this container because an emulator/Xcode toolchain is unavailable. Expo web export and cloud-browser interaction are the current visual evidence.
- BMONI documents no idempotency key. A timed-out create-user request therefore has an unknown result and must not be retried automatically.
- The shared sandbox key proves connectivity but is not a production credential and is not committed to the repository.
- The Phase 4 live create-user checkpoint remains incomplete because no authorized test identity has been supplied.

## Next Phase

Phase 4 — BMONI API Foundation

Complete the existing foundation checkpoint by exercising documented sandbox user creation with an authorized test identity and verifying the stored BMONI identifier. Do not begin wallet provisioning, device signing, KYC, or bank movement in Phase 4.

## Environment Variables

- `NODE_ENV` — API environment
- `API_HOST` — API listen host
- `API_PORT` — API port, default `4000`
- `BMONI_BASE_URL` — API only; confirmed development origin
- `BMONI_API_KEY` — API only; never exposed to mobile
- `BMONI_REQUEST_TIMEOUT_MS` — API provider timeout
- `DATABASE_URL` — SQLite identity-mapping URL
- `EXPO_PUBLIC_API_URL` — public mobile-to-API URL; never contains secrets

## Architecture Decisions

- MONIFlow Operator remains embedded in Home instead of becoming a separate chat tab.
- Route files own screen composition; shared components are introduced only for repeated patterns.
- All Phase 3 financial values come from a dedicated mock-data module and are visibly labeled.
- Tab navigation uses a custom text-only bar, avoiding placeholder glyphs and preserving the editorial/technical visual language.
- Glass remains reserved for intelligence/focus moments; normal financial surfaces stay soft and opaque.
- Consequence Mode increases contrast and removes decorative motion around approval.
- A static confirmation advances navigation only; it does not create provider, wallet, approval, or transaction state.
- BMONI partner credentials and REST calls remain server-side; private wallet keys and future signing stay on-device.

## Demo Status

Target instruction:

> Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.

The entire intended UI journey is navigable with explicit static-preview labels. The command is not parsed, approved, signed, submitted, settled, or represented as provider success. Phase 3 demonstrates product structure and consequence clarity only.
