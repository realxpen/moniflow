# MONIFlow Project State

## Current Phase

Phase 8 — Intent Engine

Phase 8 is implemented on `main` as a deterministic, validated intent layer. MONIFlow does not use an LLM for MVP intent classification. Supported commands are parsed through explicit grammar rules and strict Zod schemas; unclear or incomplete instructions resolve to `UNSUPPORTED` instead of being guessed.

## Working

- Phase 1 pnpm workspace, Expo Router mobile app, Fastify API, and package boundaries
- Phase 2 semantic tokens, foundational components, bounded motion, and private design-system showcase
- Phase 3 onboarding, tabs, Home operator, bank preview, and operator review journey
- Phase 4 centralized sandbox-only BMONI REST client, canonical user creation, SQLite `bmoniUserId` mapping, and safe developer status surface
- Phase 5 BMONI React Native signer integration, owner-proof challenge signing, managed CNGN wallet creation, and public wallet metadata persistence
- Phase 6 Nigeria sandbox identity/KYC submission, Nigeria onboarding start, and provider onboarding status checks
- Phase 7 provider-backed wallet state, CNGN balance, and NGN virtual-account surface on Home
- Phase 8 supported intents:
  - `CHECK_BALANCE`
  - `BANK_WITHDRAWAL`
  - `CREATE_POCKET`
  - `ALLOCATE_POCKET`
  - `SHOW_ACTIVITY`
  - `MULTI_ACTION`
  - `UNSUPPORTED`
- Strict Zod schemas validate every parsed intent before it leaves the API
- `BANK_WITHDRAWAL` requires an explicit supported saved-bank alias, explicit NGN/naira amount syntax, and always sets `requiresApproval: true`
- Compact monetary syntax such as `₦40k` and explicit naira syntax such as `₦40,000` are normalized deterministically
- Saved-bank aliases are explicitly mapped for GTBank, Access Bank, Zenith Bank, UBA, and FirstBank; unknown bank names are not guessed
- Pocket creation and allocation require an explicit pocket target
- `MULTI_ACTION` is emitted only when every clause parses to a supported atomic intent; a mixed supported/unsupported command resolves to `UNSUPPORTED`
- Canonical example `Withdraw ₦40,000 to my GTBank account` maps to the required `BANK_WITHDRAWAL` structure
- Canonical example `Withdraw ₦40k to GTBank and save ₦20k for laptop` maps to `MULTI_ACTION` with withdrawal + pocket allocation
- MONIFlow route: `POST /api/operator/intent` with `{ "input": "..." }`
- Home passes the actual Operator command into `/operator/processing`
- Operator processing calls the deterministic API and displays the validated result or an explicit unsupported state
- Phase 8 performs classification/structuring only; it does not execute financial actions

## Intent Safety Boundary

- There is no LLM fallback in Phase 8.
- There is no fuzzy bank-name inference.
- There is no implicit currency conversion.
- Monetary actions require explicit supported monetary syntax.
- Unknown, ambiguous, partially supported, or incomplete instructions do not degrade into a best guess.
- A multi-action instruction is atomic at the parsing boundary: every clause must be understood or the whole command becomes `UNSUPPORTED`.
- External money movement is marked as requiring human approval in the intent itself.

## Phase 8 Test Coverage Added

Parser and route tests cover:

- canonical `BANK_WITHDRAWAL`
- `₦40k` normalization
- canonical `MULTI_ACTION`
- `CHECK_BALANCE`
- `CREATE_POCKET`
- `ALLOCATE_POCKET`
- `SHOW_ACTIVITY`
- unknown bank rejection
- mixed supported/unsupported multi-action rejection
- missing explicit naira syntax rejection
- empty input rejection
- `POST /api/operator/intent` response contract

## Not Yet Verified

- Workspace install/typecheck/test commands have not been executed from this chat environment, so the new Phase 8 tests are committed but must still be run in a networked build/CI environment.
- The earlier Phase 4–7 live BMONI checkpoints still need to be proven against the deployed sandbox user.
- Phase 8 intentionally does not check whether a parsed saved-bank destination actually exists for the user; that belongs in the plan/validation stage.
- Phase 8 intentionally does not check current balance sufficiency; that belongs in MONI Guard / consequence review.

## Next Checkpoint

1. Run `pnpm typecheck` and `pnpm test` in a networked development/CI environment.
2. Verify all Phase 8 parser tests pass deterministically.
3. From Home, submit `Withdraw ₦40,000 to my GTBank account` and confirm the Operator screen shows `BANK_WITHDRAWAL`, NGN 40000, GTBank, and approval required.
4. Submit `Withdraw ₦40k to GTBank and save ₦20k for laptop` and confirm `MULTI_ACTION` contains exactly two validated actions.
5. Submit ambiguous and unsupported phrases and confirm MONIFlow returns `UNSUPPORTED` without inventing parameters.
6. After this checkpoint, proceed to the Money Plan Engine, where parsed intent becomes an executable-but-not-yet-authorized plan with provider/account validation, balance consequences, and approval state.

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

- Intent parsing is deterministic before any future LLM enhancement.
- Zod is the final contract boundary even for results produced by internal deterministic rules.
- Intent parsing answers "what did the user explicitly ask for?" only; it does not decide whether the action is financially safe or executable.
- Saved destination resolution in Phase 8 is a strict label/alias classification, not provider account verification.
- Human approval requirements are encoded directly into external movement intents.
- The next layer must consume the validated intent rather than reparsing the user's natural-language command.
