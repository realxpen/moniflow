# MONIFlow Project State

## Current Phase

Phase 9 — Money Plan Engine

Phase 9 is implemented on `main` as the consequence-planning layer between deterministic intent and future safety/approval. The Money Plan Engine consumes the already-validated Phase 8 intent unchanged, reads the provider-backed CNGN available balance, separates external movement from internal pocket allocation, and calculates the money that remains available/unallocated after both categories.

## Working

- Phase 1 pnpm workspace, Expo Router mobile app, Fastify API, and package boundaries
- Phase 2 semantic tokens, foundational components, bounded motion, and private design-system showcase
- Phase 3 onboarding, tabs, Home operator, bank preview, and operator review journey
- Phase 4 centralized sandbox-only BMONI REST client, canonical user creation, SQLite `bmoniUserId` mapping, and safe developer status surface
- Phase 5 BMONI React Native signer integration, owner-proof challenge signing, managed CNGN wallet creation, and public wallet metadata persistence
- Phase 6 Nigeria sandbox identity/KYC submission, Nigeria onboarding start, and provider onboarding status checks
- Phase 7 provider-backed wallet state, CNGN balance, and NGN virtual-account surface on Home
- Phase 8 deterministic Intent Engine with strict Zod validation and no LLM fallback
- Phase 9 strict Money Plan schema with typed action cards and totals
- Onboarding identity now calls `POST /api/onboarding/user` instead of acting as a local-only preview
- `localUserId` is generated server-side when absent and an existing mapping is recovered by email when available
- The generated/recovered `localUserId` is carried automatically through web/native wallet setup, Nigeria onboarding, success, Home, Intent, and Money Plan flows
- The Nigeria onboarding screen no longer asks the user to type a Local User UUID; sandbox details show only a read-only shortened internal identifier
- `POST /api/operator/plan` accepts a validated Phase 8 intent plus `localUserId`; it does not reparse natural language
- The API resolves the BMONI user mapping server-side and reads the provider-backed CNGN available balance before building the plan
- Plan action mapping:
  - `BANK_WITHDRAWAL` → external movement
  - `ALLOCATE_POCKET` → internal allocation
  - `CREATE_POCKET` → no money movement
  - `CHECK_BALANCE` → no money movement
  - `SHOW_ACTIVITY` → no money movement
  - `MULTI_ACTION` → ordered composition of the atomic actions
- Plan totals always expose:
  - `externalMovement`
  - `internalAllocation`
  - `totalCommitted`
  - `availableAfter`
- Calculation rule: `availableAfter = currentAvailable - externalMovement - internalAllocation`
- Canonical example: ₦300,000 current − ₦40,000 GTBank withdrawal − ₦20,000 Laptop allocation = ₦240,000 available/unallocated
- Internal pocket allocations reduce the user-facing available/unallocated amount even though they do not leave the provider wallet
- Phase 9 preserves exact arithmetic even when a plan would go negative; blocking insufficient funds belongs to the next Guard/safety phase
- Home Operator now passes the local wallet identity through the intent stage into the Money Plan flow
- The Money Plan screen uses provider-backed balance data, oversized money typography, modular numbered action cards, compact movement labels, and a high-contrast Available After consequence card inspired by the project moodboard
- Technical/provider details stay out of the main plan surface
- The plan screen remains preview-only and performs no signing or execution

## Money Plan Safety Boundary

- Phase 9 does not reinterpret natural language. It consumes the validated Phase 8 intent object.
- `UNSUPPORTED` cannot become a Money Plan.
- Current balance is read from BMONI rather than supplied by the mobile client.
- External and internal commitments are accounted for separately and then combined for the available-after calculation.
- The plan does not authorize movement, sign a proposal, or call withdrawal execution APIs.
- A negative `availableAfter` is displayed honestly so the next Guard layer can explain and block it deterministically.

## Phase 9 Test Coverage Added

Pure Money Plan Engine tests cover:

- canonical multi-action calculation: ₦300k − ₦40k − ₦20k = ₦240k
- bank withdrawal external movement
- pocket allocation internal commitment
- balance check with no movement
- pocket creation with no movement
- activity view with no movement
- exact negative outcome arithmetic prior to Guard enforcement
- refusal to create a plan from `UNSUPPORTED`

## Not Yet Verified

- Workspace install/typecheck/test commands have not been executed from this chat environment, so Phase 9 tests are committed but must still be run in a networked build/CI environment.
- The new automatic onboarding identity handoff still needs a deployed end-to-end run: Identity → wallet → Nigeria onboarding without manual UUID entry.
- The earlier Phase 4–7 live BMONI checkpoints still need to be proven against the deployed sandbox user.
- The provider-backed `/api/operator/plan` checkpoint requires the same mapped sandbox user to have a readable CNGN account balance.
- Saved-bank aliases remain Phase 8 classifications; provider verification of the exact destination account still belongs to the withdrawal/Guard layer.
- Phase 9 intentionally does not block insufficient funds, stale balance, or risky destinations. Those belong to MONI Guard.

## Next Checkpoint

1. Redeploy the API and mobile/web build so the automatic identity handoff is active.
2. Start from Identity and confirm Continue creates or recovers a `localUserId` without asking the user to see or type it.
3. Confirm wallet setup and Nigeria onboarding receive the same `localUserId` automatically.
4. Run `pnpm typecheck` and `pnpm test` in a networked development/CI environment.
5. Confirm all Phase 9 plan-engine calculation tests pass.
6. With a provider-backed sandbox balance of ₦300,000, submit `Withdraw ₦40k to GTBank and save ₦20k for laptop`.
7. Confirm Phase 8 emits the validated `MULTI_ACTION` unchanged into Phase 9.
8. Confirm the Money Plan UI shows GTBank Withdrawal ₦40,000, Laptop Allocation ₦20,000, External movement ₦40,000, Internal allocation ₦20,000, and Available after ₦240,000.
9. Confirm `CHECK_BALANCE`, `CREATE_POCKET`, and `SHOW_ACTIVITY` leave `availableAfter` unchanged.
10. Confirm a plan larger than the current balance shows the negative consequence without executing anything.
11. After this checkpoint, proceed to MONI Guard / consequence validation and human approval policy.

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

- User-facing onboarding never requires knowledge of `localUserId`; it is an internal MONIFlow identifier.
- The backend owns local UUID generation and can recover an existing mapping by email.
- Intent Engine answers what the user explicitly asked for; Money Plan Engine answers what that request would do to their money.
- The Money Plan boundary accepts structured intent, not raw natural language.
- Provider-backed CNGN available balance is the starting balance for plan arithmetic.
- Pocket allocation is logical MONIFlow bookkeeping, but it still reduces the amount presented as available/unallocated.
- External movement and internal allocation remain separate concepts throughout the plan so later Guard and approval rules can reason about them independently.
- The plan is explanatory and deterministic; authorization and execution remain separate future states.
