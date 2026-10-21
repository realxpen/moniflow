# Phase 33F — Offline Intent Lab (2026-10-21)

## Product milestone

After owner squash-merged Phase 33E in PR #43, added a **type-your-own limited sample instruction** learning tool. This is a separate, local, strict educational subset of MONIFlow's intent grammar, **not** the authoritative API intent parser, a server Money Plan, a real MONI Guard decision or an authorization to move funds.

### What users can do

- Visit `/learn/intent` from the Learning & Practice hub.
- Try six example phrases or edit a short instruction.
- Recognize a single **GTBank withdrawal**, a single **Laptop pocket allocation**, or both in either order, using explicit whole-naira amounts (`₦40,000`, `NGN 40000`). Only these bank/pocket names are accepted. Up to one of each action; no partially successful multi-action interpretation.
- Recognize `Check my balance` and `Show my recent activity` as requests that **require genuine provider read access**, but show no personal financial data.
- Show the previously implemented local, fixed ₦300,000 illustrative arithmetic only for fully recognized and non-overspending actions.
- For unknown banks/pockets, malformed amounts, missing naira signs, zero amounts, repeated actions, third actions, overlong requests or non-financial instructions, explain that the example is unsupported **without returning partially recognized actions or any balance**.
- For sample overspending, return a **blocked example**, not a provider balance or approval.

### Safety boundaries

- `simulationOnly=true`, `realExecutionAllowed=false`, `bankVerified=false` are unconditional.
- No personal API, provider SDK, bank verification, EIP-191 signatures, wallet PIN, identity, KYC, saved destination, actual balance, transaction or approval state is loaded, produced or persisted. No route changes existing money APIs.
- This implementation intentionally does **not** reuse the API parser because it must not accidentally broaden the language that can be read or imply equivalence with production capabilities; no financial automation is activated.
- The bank and pocket names are examples, **not** assertions about the user's connected bank account or existing saved pocket.
- No new Expo build, Vercel production deployment, BMONI financial call, database mutation, secret change, or sandbox user creation is authorized.

### Acceptance

1. PR CI: TypeScript, Expo web export, Vitest, and existing disposable PostgreSQL identity controls pass.
2. Review the typed phrase rejection matrix, bank restrictions, no-partial-plan invariant, and distinction between math-only preview and verified money movement.
3. Owner separately reviews/squash-merges the PR. A merge does not update a native APK.
4. When emulator/physical Android access returns, smoke test Learning Hub → Intent Lab → select each sample → edit invalid text → verify refusal; ensure no account prompts or API requests; return to Hub.
5. Actual BMONI identity reconciliation, native owner proof, KYC, financial data reads and provider-backed money execution remain blocked by the established Phase 32–35 evidence gates.

References: `docs/MONIFLOW_PRODUCT_SOURCE.md`, `docs/PHASE33D_LEARNING_PRACTICE.md`, `docs/PHASE33E_OFFLINE_MONEY_PLAN_PLAYGROUND.md`, `apps/api/src/services/intent/parser.ts` (production reference only).
