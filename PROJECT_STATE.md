# MONIFlow Project State

## Current build

Hackathon MVP v0.1

## Current phase

Phase 0 — Foundation / repository initialization

## Working

- GitHub repository created
- Product direction defined
- README initialized
- Agent development rules defined

## Not built yet

- pnpm monorepo
- React Native mobile app
- TypeScript API
- BMONI sandbox integration
- BMONI React Native SDK integration
- Intent Engine
- Money Plan Engine
- MONI Guard
- approval state machine
- bank verification / offramp
- activity and pockets

## Next

1. Add the full product source document.
2. Scaffold the pnpm monorepo.
3. Create `apps/mobile` and `apps/api`.
4. Add `packages/shared`, `packages/intent-engine`, and `packages/moniguard`.
5. Configure environment variables and BMONI sandbox client.
6. Prove BMONI connectivity before building the full UI.

## BMONI source of truth

https://bkey.mintlify.app/

## Primary demo command

> Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.

## Required execution rule

No external financial action may begin before the Money Plan passes MONI Guard and receives explicit human approval.

## Environment

Sandbox only.

## Known blockers

None recorded yet.
