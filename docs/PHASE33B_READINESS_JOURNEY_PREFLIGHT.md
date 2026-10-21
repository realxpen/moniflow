# Phase 33B preflight — Account verification journey (2026-10-21)

**Scope:** Read-only account status guidance for the authenticated mobile Profile while supported-device BMONI owner proof, provider-approved identity evidence and Nigeria onboarding remain blocked. This is **NOT Phase 33B wallet proof completion** and **NOT Phase 34 financial-read authorization**.

## What was built

- `apps/mobile/services/account-readiness-journey.ts` is a pure deterministic presenter that accepts only the already-validated, signed-in `AccountWorkspaceOverview` and `AccountReconciliationReadiness` shapes. It performs no HTTP calls, BMONI SDK calls, account linking, KYC requests or transactions.
- The five independent security checks appear as a timeline in Profile:
  1. MONIFlow authenticated account access (the **only** potentially verified step).
  2. BMONI identity reconciliation (evidence required / locally recorded only / manual hold / unknown).
  3. Device wallet ownership (not checked / local record not reverified).
  4. Nigeria onboarding and KYC (not checked).
  5. Provider-backed balances and Activity (withheld).
- A bounded **What happens next** explanation reflects the trusted, owner-scoped reconciliation state. A provider 409/unknown provisioning hold says *pause; no automatic retry*; a locally recorded mapping never becomes BMONI ownership evidence. No user is instructed to submit KYC documents in an unapproved preview flow.
- The UI is deliberately disabled-action only: there are no new financial CTA buttons, transfers, balances, account linkage, mock receipts, or fake provider completion states.
- Mismatched subjects, inflated permissions, impossible combinations, omitted review data and unknown workspace data must fail closed to an unverified journey.

## Review and acceptance

1. `pnpm typecheck`, `pnpm --filter @moniflow/mobile build:web`, and `pnpm test` (including new `account-readiness-journey.test.ts`), plus the existing disposable PostgreSQL evidence gate must pass.
2. Review the Profile state matrix in code: signed in with no link; signed in with unverified mapping; unresolved manual review hold; no reconciliation response; invalid cross-account response; account switch; storage failure. Never call a *recorded* mapping or wallet `VERIFIED`.
3. Merge only after owner code review. **Code merge does not update existing physical Android, iOS Simulator, or Waydroid APKs.** EAS app build requests require a separate approval; the existing x86_64 build approval was consumed by EAS build `d45c9566-bb4e-45c0-9221-765299666500`.
4. No new Vercel API deployment is needed for this UI-only change. Existing production `/api/workspace/overview` and `/api/workspace/reconciliation` remain read-only with disabled provider financial flags. An API response 503 or unresolved provider hold continues to block identity and financial transitions.
5. Actual Phase 33B remains dependent on private provider-approved identity evidence, a supported physical device, the documented EIP-191 ownership challenge and safe verification of a uniquely linked user. Phase 34 requires independently verified provider read authorization; never invent wallet balances or infer transactions from an empty local database.

## Source-of-truth alignment

- `docs/MONIFLOW_PRODUCT_SOURCE.md`: plan before execution, safety before automation, infrastructure not illusion, human authorization.
- `docs/PHASE31_WORKSPACE_RECOVERY.md`: Phase 32–35 dependency order and stop conditions.
- `docs/PHASE32_IDENTITY_RECONCILIATION_READINESS.md`: local status is not provider proof; unresolved holds require manual review.
- `docs/PHASE33A_ANDROID_RECONCILIATION_PROFILE.md`: Profile is read-only; only validated owner data and opaque support references may appear.
