# Phase 33E — Offline Money Plan Playground

Date: 2026-10-21  
Scope: An emulator-independent **educational calculator** inside the existing Learning & Practice experience. It is **not** the MONIFlow production intent engine, a server Money Plan, a MONI Guard decision, a provider balance, an approval, or a real transfer.

## Implemented

- `/learn/playground` lets a user edit illustrative whole-naira withdrawal and Laptop Money Space allocation amounts against a clearly disclosed fixed, fictional ₦300,000 opening balance.
- Three presets: everyday sample (₦40,000 external / ₦20,000 internal), savings-heavy sample (₦15,000 / ₦100,000), and an intentionally overspending sample (₦250,000 / ₦100,000).
- Pure `evaluatePlayground()` in `services/money-plan-playground.ts` parses strictly numeric, nonnegative integer NGN text, rejects signs/decimals/thousands separators/scientific notation/leading zeros and numbers above ₦1,000,000,000, and requires at least one positive sample action.
- A calculation is previewable only when total commitments are no greater than the fictional opening balance. Invalid or overspending entries show **no hypothetical resulting provider balance or available funds**.
- The example external withdrawal reduces the illustration of provider funds, and the internal pocket allocation reduces the amount hypothetically available to spend. The pocket is **not** another provider-held wallet.
- The check list deliberately reports real bank destination verification as **false in every case**, even if the arithmetic passes. `financialOperationsEnabled=false`, `bankDestinationVerified=false` and `simulationOnly=true` remain unconditional; no provider balance or approval can be unlocked by editing amounts.
- The Learning Hub links to the Playground, which returns to Learning & Practice without exposing tokens or user IDs.
- Vitest covers arithmetic, overspending by ₦1, both-zero input, boundary cases, malformed inputs, presets and the absence of finance APIs or signing/persistence imports.

## Architecture and safety

The Playground imports no personal workspace state, BMONI SDK, bank verification, API client, backend operator, device signer, KYC data, storage, or actual balance. No wallet keys, authorization, financial requests, side effects or database writes. Its fictional numbers must never appear as personal account data or provider-confirmed activity.

The existing guided walkthrough and single-command Operator simulator continue unchanged, and the `/learn` hub clearly distinguishes its tools. No claim of arbitrary natural-language parsing or a real MONI Guard `ALLOW` verdict is made.

## Review and evidence gates

1. PR CI: `pnpm typecheck`, Expo web export, Vitest, and existing isolated PostgreSQL tests.
2. Owner code review and squash merge separately; no automatic merge.
3. No EAS Android build, production API deployment or BMONI sandbox operation is authorized by this PR. Existing physical and Waydroid APKs do not update from a source merge.
4. Future emulator/device acceptance: Learning Hub → Money Plan Playground; modify two fields, try all three presets and malformed inputs, verify hypothetical amounts are withheld on invalid/overspending input; confirm the return path and no real wallet prompts.
5. Real provider identity, device owner proof, KYC, balances and external execution remain gated by the previously recorded Phase 32–35 evidence and approvals.

Project sources: `docs/MONIFLOW_PRODUCT_SOURCE.md`, `docs/MONIFLOW_BUILD_PLAN.md`, `docs/PHASE33D_LEARNING_PRACTICE.md`.
