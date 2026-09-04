# MONIFlow Project State

## Current Phase

Phase 2 — UI Design System

The reusable mobile visual system and private component showcase are implemented and visually verified. Full product screens and navigation composition remain Phase 3 work.

## Working

- Phase 1 pnpm workspace, Expo Router mobile app, Fastify API, and package boundaries
- Semantic mobile tokens for color, spacing, radius, type, elevation, and motion
- Editorial and technical typography roles
- Calm, Intelligence, Safety, and Consequence visual modes
- `Screen`, `SoftCard`, `GlassCard`, `PrimaryButton`, `SecondaryButton`, `Pill`, `StatusPill`, `MoneyText`, and `SectionTitle`
- `OperatorInput`, `SuggestionChip`, `GuardCheck`, `ProgressStep`, `PocketCard`, `ActivityRow`, `BalanceCard`, `BottomSheet`, and `ConfirmationButton`
- Reduced-motion-aware fade/rise entries, sequential checks, and processing pulse
- Brief tactile confirmation using the platform vibration boundary
- Private `/_dev/design-system` showcase outside the user-facing tabs
- Clearly labeled mock values in the showcase
- Browser-verified operator suggestion, plan sheet, sheet dismissal, and confirmation states
- Typecheck, lint, tests, build, and Expo web export

The server-side BMONI API foundation was implemented ahead of the agreed Phase 4 sequence and remains preserved. It includes sandbox-only configuration, typed REST access, strict Zod contracts, connectivity, documented user creation, SQLite identity mapping, typed errors, and tests.

## Not Yet Implemented

- Phase 3 static product shell and finished navigation composition
- Real full product screens
- BMONI React Native SDK, wallet provisioning, ownership, or device signing
- KYC or Nigeria onboarding flow
- provider-backed wallet dashboard and balances
- deterministic Intent Engine or LLM parsing
- Money Plan Engine and complete plan state machine
- complete deterministic MONI Guard rule engine
- approval persistence or execution authorization
- bank discovery, verification, withdrawal, offramp, or proposals
- provider-backed Activity or application persistence for Money Pockets
- GhostPay, TrustDrop, LifeWallet, analytics, or production payments

## Known Issues

- The current editorial type role uses the platform sans font. A licensed bundled editorial family may be evaluated during Phase 17; no network font is required for Phase 2 coherence.
- Native Android/iOS binaries are not compiled in this container because an emulator/Xcode toolchain is unavailable. The Expo web export and cloud-browser interaction pass are the current visual evidence.
- BMONI documents no idempotency key. A timed-out create-user request therefore has an unknown result and must not be retried automatically.
- The shared sandbox key proves connectivity but is not a production credential.
- The Phase 4 live create-user checkpoint remains incomplete because no authorized test identity has been supplied.

## Next Phase

Phase 3 — Shell and Navigation

Compose the static onboarding, tab, operator, and bank routes using the Phase 2 components. Keep the MONIFlow Operator within Home, preserve clear mock labels, and prove the complete static journey can be navigated without contacting BMONI.

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

- The design system is token-led and native-first; no parallel web design system was introduced.
- Glass is reserved for intelligence/focus moments, while ordinary financial surfaces remain soft and opaque.
- Financial states use words as well as color, and touch targets remain at least 44 points.
- Motion is bounded, honors reduced-motion settings, and becomes restrained in Consequence Mode.
- The showcase is an internal route and must not become a permanent tab.
- Confirmation remains explicit; a tap and haptic response do not represent provider execution or success.
- BMONI partner credentials and REST calls remain server-side; private wallet keys and future signing stay on-device.
- Provider-backed and application-level financial state must remain visibly distinguishable.

## Demo Status

Target future instruction:

> Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.

Phase 2 presents this instruction only as labeled design-showcase content. It is not parsed, approved, signed, executed, settled, or represented as provider success.
