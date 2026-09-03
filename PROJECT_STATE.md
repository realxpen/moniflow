# MONIFlow Project State

## Current Phase

Phase 1 — Foundation

Hackathon MVP v0.1. Phase 0 repository inspection and Phase 1 scaffolding are complete. Phase 2 has not started.

## Working

- pnpm workspace with `apps/*` and `packages/*`
- Expo + React Native + TypeScript mobile shell
- Expo Router onboarding, tabs, operator, and bank route tree
- Expo development-client configuration and native prebuild path
- TanStack Query provider; Zustand, Zod, and React Hook Form dependencies ready
- Calm Financial Intelligence theme tokens
- Foundational UI components: `Screen`, `SoftCard`, `GlassCard`, `PrimaryButton`, `SecondaryButton`, `Pill`, `StatusPill`, `MoneyText`, and `SectionTitle`
- Home composition placeholder with explicitly labeled mock UI data
- Fastify + TypeScript API
- Centralized API environment validation
- `GET /health` returning real service/environment state
- Empty API route and service boundaries for later product phases
- Shared supported-intent and Money Plan status Zod contracts
- Intent Engine public interface boundary with no parser or execution logic
- MONI Guard verdict/check contracts with no rule engine
- UI/UX, BMONI boundary, and target demo documentation
- Typecheck, lint, unit tests, workspace build, Expo/Metro startup, web route bundle, API startup, and HTTP health validation

## Not Yet Implemented

- BMONI REST client or connectivity
- BMONI user creation
- BMONI React Native SDK
- wallet provisioning, ownership, or device signing
- KYC or Nigeria onboarding
- wallet or provider balance retrieval
- bank discovery, verification, withdrawal, offramp, or proposals
- natural-language or deterministic parsing
- Money Plan Engine or approval state machine
- MONI Guard rule engine
- SQLite schema or persistence
- real Activity or Money Pockets data
- GhostPay, TrustDrop, LifeWallet, analytics, or production payments

## Known Issues

- No blocking code issues are known.
- Native Android/iOS binaries were not compiled in this container because no emulator/Xcode toolchain is available. Expo/Metro startup and a complete web route bundle were validated.
- Expo's offline dependency check passes with a warning that offline validation is less authoritative; installed native versions are pinned to Expo SDK 57's bundled compatibility map.

## Next Phase

Phase 2 — BMONI Foundation

Before implementation, inspect the current official BMONI documentation/OpenAPI. Confirm the sandbox base URL, authentication, supported user-creation flow, exact schemas, error handling, idempotency, and status behavior. Then implement only the server-side REST foundation and a real non-sensitive connectivity proof.

Do not begin wallet provisioning, KYC, withdrawal, signing, or financial execution as part of that connectivity checkpoint unless separately scoped and documentation-backed.

## Environment Variables

- `NODE_ENV` — API environment
- `API_HOST` — API listen host
- `API_PORT` — API port, default `4000`
- `BMONI_BASE_URL` — API only; sandbox base URL
- `BMONI_API_KEY` — API only; secret and never exposed to mobile
- `DATABASE_URL` — future SQLite persistence URL
- `EXPO_PUBLIC_API_URL` — public mobile-to-API URL; never contains secrets

## Architecture Decisions

- Mobile owns UI, local state, explicit authorization UX, future device wallet actions, and signing.
- API owns credentials, provider REST access, orchestration, policy enforcement, plans, and persistence.
- The mobile app targets Expo development builds through `expo-dev-client`; Expo Go is optional for Phase 1 UI inspection only.
- BMONI code is deferred rather than mocked. `apps/api/src/services/bmoni` is an empty documented boundary.
- The Intent Engine only parses to a validated intent and can never execute financial operations.
- MONI Guard is deterministic and never delegated to an LLM.
- Pockets will be application-level bookkeeping unless current provider documentation proves real partitioning support.
- Semantic theme tokens and four visual modes guide UI implementation; glass remains selective.
- SQLite is deferred until a real persistence requirement appears.
- Sandbox and production must remain separate, and provider success must be verified rather than inferred.

## Demo Status

Target future instruction:

> Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.

The intended route journey exists as clearly labeled placeholders:

`Home → command → parsing → Money Plan → MONI Guard/human approval → signing → result → Activity/Pockets`

No step currently parses, approves, signs, executes, moves money, or claims provider success.
