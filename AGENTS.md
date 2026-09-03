# MONIFlow Agent Instructions

Read `docs/MONIFLOW_PRODUCT_SOURCE.md` before making product or architecture decisions.

## Product

MONIFlow is an intelligent financial operating system built on BMONI Embedded. It turns natural-language financial intentions into structured, safe, human-approved financial workflows.

## Hackathon priority

The Hackathon MVP scope takes priority over future-roadmap features.

Do not implement GhostPay, TrustDrop, full LifeWallet, accounting, investments, loans, cards, trading, or unrestricted financial automation for the MVP.

## Required financial flow

User Intent → Structured Intent → Money Plan → MONI Guard → Human Review → Explicit Approval → BMONI Proposal/Execution → Device Signing when required → Verification

## Non-negotiable rules

1. BMONI documentation is the source of truth: https://bkey.mintlify.app/
2. Before modifying BMONI integration, inspect the current documentation/OpenAPI.
3. Never invent BMONI endpoints, SDK methods, payloads, enums, or response shapes.
4. AI-generated text must never directly execute financial operations.
5. Every consequential external money movement requires explicit user authorization.
6. The BMONI API key must remain server-side.
7. Wallet private keys must remain on-device and must never be logged or sent to the backend.
8. Never fake a successful BMONI financial operation.
9. Use BMONI sandbox only during the hackathon.
10. Changing a plan amount or destination invalidates prior approval.

## Architecture boundaries

- `apps/mobile` owns UI, local session, BMONI device SDK interaction, secure wallet actions, signing, and authorization UX.
- `apps/api` owns BMONI REST credentials, REST calls, business logic, Money Plans, orchestration, persistence, and execution coordination.
- `packages/intent-engine` owns intent parsing and schema validation. It must not know BMONI endpoint names.
- `packages/moniguard` owns deterministic financial safety and policy checks.
- `packages/shared` owns reusable TypeScript/Zod contracts.

## Development process

After each major checkpoint:

- run typecheck;
- run relevant tests;
- run affected apps;
- fix blocking errors rather than hiding them with mocks;
- update `PROJECT_STATE.md`.

Working integration is more important than visual completeness.
