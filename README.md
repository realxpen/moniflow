# MONIFlow

MONIFlow is an intelligent financial operating system that turns natural-language money intentions into safe, programmable, human-approved financial workflows powered by BMONI Embedded.

This repository contains the BMONI Embedded Hackathon MVP. The primary future demo instruction is:

> Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.

The required execution flow is:

`User Intent → Structured Intent → Money Plan → MONI Guard → Human Review → Explicit Approval → BMONI Execution → Device Signing when required → Verification`

## Current phase

Phase 1 — Foundation. The monorepo, mobile route shell, design system foundation, API health check, and domain boundaries work. BMONI, wallet, KYC, parsing, Guard rules, approval execution, and financial operations are not implemented.

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
```

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

Expo Go can be used only for temporary Phase 1 UI inspection with `pnpm --filter @moniflow/mobile start:go`; it is not the architectural target.

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
| `DATABASE_URL` | API | Future SQLite connection string |
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

Product decisions come from [`docs/MONIFLOW_PRODUCT_SOURCE.md`](docs/MONIFLOW_PRODUCT_SOURCE.md), and engineering rules come from [`AGENTS.md`](AGENTS.md). BMONI integration must follow the current [official documentation](https://bkey.mintlify.app/).
