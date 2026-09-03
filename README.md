# MONIFlow

MONIFlow is an intelligent financial operating system that turns natural-language money intentions into safe, programmable financial workflows powered by BMONI Embedded.

## Hackathon MVP

The MVP proves that a user can express a multi-step financial objective naturally, have MONIFlow convert it into a structured Money Plan, validate it with MONI Guard, require explicit human approval, and then execute supported financial actions through BMONI Embedded.

### Primary demo command

> Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.

### Core flow

User Intent → Structured Financial Intent → Money Plan → MONI Guard → Human Approval → BMONI Execution → Verification

## Architecture

- `apps/mobile` — React Native client, wallet interaction, signing, approval UX
- `apps/api` — TypeScript backend, BMONI REST integration, plan orchestration
- `packages/shared` — shared types and schemas
- `packages/intent-engine` — deterministic and optional LLM intent parsing
- `packages/moniguard` — deterministic financial safety rules
- `docs` — product source, architecture, integration, security, and demo docs

## Development principles

- BMONI documentation is the source of truth: https://bkey.mintlify.app/
- Never invent BMONI endpoints or SDK methods.
- AI never executes financial actions directly.
- Every external money movement requires explicit user approval.
- Keep BMONI API credentials server-side.
- Keep wallet private keys on-device.
- Sandbox only for the hackathon.

## Status

Hackathon MVP v0.1 — initialization phase.
