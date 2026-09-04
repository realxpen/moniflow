# MONIFlow

MONIFlow is an intelligent financial operating system that turns natural-language money intentions into safe, programmable, human-approved financial workflows powered by BMONI Embedded.

This repository contains the BMONI Embedded Hackathon MVP. The primary future demo instruction is:

> Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.

The required execution flow is:

`User Intent → Structured Intent → Money Plan → MONI Guard → Human Review → Explicit Approval → BMONI Execution → Device Signing when required → Verification`

## Current phase

Phase 2 — UI Design System. The native-first token system, reusable financial components, bounded motion, and private component showcase are implemented. Full screen composition and navigation are Phase 3 work.

The backend also contains BMONI API groundwork implemented ahead of its planned Phase 4 checkpoint. It is preserved, but Phase 4 is not complete until live sandbox user creation is exercised with an authorized test identity.

## Architecture

```text
apps/
  mobile/          Expo + React Native client and future device-signing boundary
  api/             Fastify server and future server-side BMONI REST boundary
packages/
  shared/          Zod schemas and shared financial contracts
  intent-engine/   Parsing boundary; never executes financial operations
  moniguard/       Deterministic safety boundary; never an LLM
docs/              Product, design, integration, and demo sources
```

The mobile app is configured for an Expo development build through `expo-dev-client`; it is not permanently constrained to Expo Go. Native `android/` and `ios/` projects are generated only when needed.

## Prerequisites

- Node.js 22 or newer
- pnpm 11.19 or compatible
- Expo-compatible Android/iOS tooling for native development builds

## Setup

```bash
git clone https://github.com/realxpen/moniflow.git
cd moniflow
pnpm install
cp .env.example .env
```

Do not add real credentials to `.env.example` or commit `.env`.

## Run the API

```bash
pnpm dev:api
curl http://localhost:4000/health
curl http://localhost:4000/health/bmoni
```

`/health/bmoni` requires local sandbox credentials. `POST /onboarding/users` is documented provider groundwork for Phase 4; it creates no wallet and moves no money.

## Run mobile

Start Metro for an installed Expo development client:

```bash
pnpm dev:mobile
```

Generate and run a local native development build when required:

```bash
pnpm --filter @moniflow/mobile android
# or, on macOS:
pnpm --filter @moniflow/mobile ios
```

Expo Go can be used only for temporary UI inspection with `pnpm --filter @moniflow/mobile start:go`; it is not the architectural target.

The private Phase 2 showcase is available at `/_dev/design-system`. It is not part of the product tab bar and all displayed financial values are mock data.

## Deploy the UI preview to Vercel

Import the repository as a Vercel project and set its Root Directory to `apps/mobile`. The committed `apps/mobile/vercel.json` runs the Expo web export, publishes `dist`, and preserves direct Expo Router URLs. Do not add `BMONI_API_KEY` to this mobile project.

## Quality commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Environment variables

| Variable | Runtime | Purpose |
|---|---|---|
| `NODE_ENV` | API | `development`, `test`, or `production` |
| `API_HOST` | API | Listen host; defaults to `0.0.0.0` for device access |
| `API_PORT` | API | Fastify listen port; defaults to `4000` |
| `BMONI_BASE_URL` | API only | Confirmed BMONI sandbox base URL |
| `BMONI_API_KEY` | API only | Secret BMONI application credential |
| `BMONI_REQUEST_TIMEOUT_MS` | API | Provider timeout; defaults to `10000` and is capped at `30000` |
| `DATABASE_URL` | API | SQLite identity-mapping connection string |
| `EXPO_PUBLIC_API_URL` | Mobile | Public URL used to reach MONIFlow API |

Never prefix a secret with `EXPO_PUBLIC_`; those values enter the mobile bundle.

## Safety principles

- AI-generated language never directly triggers financial execution.
- External money movement requires explicit human approval.
- `BMONI_API_KEY` remains server-side; wallet private keys remain on-device.
- Unsupported intent fails safely.
- Provider success is never fabricated.
- Sandbox and production remain separate.
- Logs must not leak credentials, keys, or sensitive authorization values.

Product decisions come from [`docs/MONIFLOW_PRODUCT_SOURCE.md`](docs/MONIFLOW_PRODUCT_SOURCE.md), the agreed sequence is in [`docs/MONIFLOW_BUILD_PLAN.md`](docs/MONIFLOW_BUILD_PLAN.md), and engineering rules come from [`AGENTS.md`](AGENTS.md). BMONI integration must follow the current [official documentation](https://bkey.mintlify.app/).
