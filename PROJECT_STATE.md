# MONIFlow Project State

## Current Phase

Phase 10 — MONI Guard

Phase 10 is implemented on `main` as the deterministic safety boundary between Money Plan explanation and human authorization. MONI Guard is a standalone workspace package, does not call an LLM, evaluates eight explicit rules, fails closed on critical mismatches, and returns one of `ALLOW`, `REVIEW`, or `BLOCK`.

## Working

- Phase 1 pnpm workspace, Expo Router mobile app, Fastify API, and package boundaries
- Phase 2 semantic tokens, foundational components, bounded motion, and private design-system showcase
- Phase 3 onboarding, tabs, Home operator, bank preview, and operator review journey
- Phase 4 centralized sandbox-only BMONI REST client, canonical user creation, SQLite `bmoniUserId` mapping, and safe developer status surface
- Phase 5 BMONI React Native signer integration, owner-proof challenge signing, managed CNGN wallet creation, and public wallet metadata persistence
- Phase 6 Nigeria sandbox identity/KYC submission, Nigeria onboarding start, and provider onboarding status checks
- Phase 7 provider-backed wallet state, CNGN balance, and NGN virtual-account surface on Home
- Phase 8 deterministic Intent Engine with strict Zod validation and no LLM fallback
- Phase 9 provider-backed Money Plan Engine with explicit external/internal consequence arithmetic
- Phase 10 deterministic MONI Guard package at `packages/moniguard`
- MONI Guard rules:
  - `SUPPORTED_INTENT`
  - `POSITIVE_AMOUNT`
  - `CURRENCY`
  - `BALANCE`
  - `DESTINATION`
  - `AMOUNT_INTEGRITY`
  - `PLAN_INTEGRITY`
  - `HUMAN_APPROVAL`
- Verdict policy:
  - `BLOCK` when any critical rule fails
  - `REVIEW` when every critical rule passes but external movement requires explicit human authorization
  - `ALLOW` when every rule passes and no external movement requires authorization
- `POST /api/operator/guard` accepts the already-validated intent plus the already-built Money Plan and returns the deterministic verdict/check list
- The guard boundary does not reparse natural language and does not rebuild the plan
- Money Plan now routes into `/operator/guard` before the approval screen
- Approval screen requires a serialized MONI Guard `REVIEW` result with every check passed; direct entry without guard clearance is blocked
- MONI Guard UI uses sequential check rows, micro-labels, a soft/translucent-style safety panel, and a high-contrast SAFE TO CONTINUE / BLOCKED outcome band
- Guard UI deliberately says saved-bank destination "matched" rather than claiming provider account verification that the current backend does not yet possess
- No guard verdict signs, authorizes, or executes funds by itself

## Rule Semantics

### SUPPORTED_INTENT
Only Phase 8 supported intents may cross the safety boundary. `UNSUPPORTED` is blocked.

### POSITIVE_AMOUNT
Money-moving actions must have finite positive values. No-movement actions must remain exactly zero.

### CURRENCY
The plan and every monetary intent remain NGN. Currency mutation is blocked.

### BALANCE
`totalCommitted` must be non-negative, no greater than current available funds, and `availableAfter` must not be negative.

### DESTINATION
Every planned bank withdrawal must correspond positionally and exactly to the validated saved-bank destination label in the Phase 8 intent. This is destination-integrity validation, not yet live provider verification of a beneficiary/account record.

### AMOUNT_INTEGRITY
Every plan action must preserve the exact amount and action kind from the validated intent. Amount substitution is blocked.

### PLAN_INTEGRITY
MONI Guard recomputes external movement, internal allocation, total committed, available-after arithmetic, and sequential action indexes independently from the plan totals. Tampered arithmetic is blocked.

### HUMAN_APPROVAL
Any external movement must retain `requiresApproval: true` at both plan and external-action level. A correct external plan yields `REVIEW`, not `ALLOW`, until the user explicitly authorizes it.

## Phase 10 Test Coverage Added

MONI Guard package tests cover:

- valid withdrawal + pocket multi-action → `REVIEW`
- altered withdrawal amount → `BLOCK`
- tampered available-after/plan totals → `BLOCK`
- insufficient funds → `BLOCK`
- destination substitution → `BLOCK`
- removal of human approval requirement → `BLOCK`
- valid non-moving balance check → `ALLOW`

This satisfies the intended malformed-plan checkpoint at the code/test-definition level: intentionally mutated financial plans are expected to fail closed.

## Safety Boundary

- MONI Guard is deterministic and contains no LLM/API inference call.
- Intent and Money Plan remain separate immutable inputs to the guard evaluation.
- A client cannot turn a blocked plan into an approval UI merely by navigating to `/operator/approve`; that screen requires a passing guard payload.
- Guard clearance is not a wallet signature and is not a BMONI execution request.
- The current `DESTINATION` rule proves intent-to-plan destination integrity only. Provider-backed saved-bank account ownership/beneficiary verification must be added when the real withdrawal destination store/rail is implemented.

## Not Yet Verified

- `pnpm install`, `pnpm typecheck`, and `pnpm test` have not been executed from this chat environment after the new `@moniflow/moniguard` workspace dependency was added.
- `pnpm-lock.yaml` has not been regenerated in this chat environment; a normal networked `pnpm install` should refresh it before using frozen-lockfile CI.
- The malformed-plan tests are committed but still need an actual Vitest run before the Phase 10 checkpoint is marked test-passed.
- Earlier live BMONI Phase 4–7 checkpoints still need a deployed sandbox end-to-end run.
- Exact saved beneficiary/provider verification is not yet available; current destination checking is structural integrity against the validated Phase 8 saved-bank classification.

## Next Checkpoint

1. Run `pnpm install` to refresh the workspace lockfile for `@moniflow/moniguard`.
2. Run `pnpm typecheck` and `pnpm test`.
3. Confirm the canonical ₦300k / ₦40k GTBank / ₦20k Laptop plan returns `REVIEW` with all eight checks passed.
4. Intentionally mutate the plan amount, destination, totals, approval flag, and available balance independently and confirm each mutation returns `BLOCK`.
5. Confirm a non-moving supported intent such as `CHECK_BALANCE` returns `ALLOW`.
6. From the mobile flow, confirm Money Plan → MONI Guard → Human Authorization is the only normal route for an external withdrawal.
7. Confirm a blocked guard result cannot advance to authorization.
8. After this checkpoint, proceed to the provider proposal / explicit device signing stage while preserving the Guard → Human approval → Signing sequence.

## Environment Variables

- `NODE_ENV` — API environment
- `API_HOST` — API listen host
- `API_PORT` — API port, default `4000`
- `BMONI_BASE_URL` — API only; sandbox origin
- `BMONI_API_KEY` — API only; never exposed to mobile
- `BMONI_REQUEST_TIMEOUT_MS` — API provider timeout
- `DATABASE_URL` — SQLite persistence URL
- `EXPO_PUBLIC_API_URL` — public mobile-to-API URL; never contains secrets
- `EXPO_PUBLIC_DEV_LOCAL_USER_ID` — optional development-only fallback local UUID

## Architecture Decisions

- User-facing onboarding never requires knowledge of `localUserId`; it remains an internal MONIFlow identifier.
- Intent Engine answers what the user explicitly asked for.
- Money Plan Engine answers what that request would do to available/unallocated money.
- MONI Guard independently verifies that the validated intent and Money Plan still agree and that the plan can safely reach the authorization boundary.
- `BLOCK` is fail-closed and must never enter approval/signing.
- `REVIEW` means deterministic checks passed but a human must authorize consequential external movement.
- `ALLOW` is reserved for plans that pass every rule without external authorization requirements.
- No LLM is permitted inside MONI Guard.
