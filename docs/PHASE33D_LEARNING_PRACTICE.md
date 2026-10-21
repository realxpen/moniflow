# Phase 33D — Learning & Practice (educational only)

**Date:** 2026-10-21  
**Scope:** Add a usable learning/practice experience without supported native hardware, linked BMONI identity or provider financial read permission.

## Why this milestone

After the signed-in account readiness view (Phase 33B preflight) and account-switch isolation (Phase 33C), the authenticated Home still offered only readiness and locked financial data. MONIFlow's core product story — Intent → Money Plan → MONI Guard → Human Review → Execution Evidence → Financial Memory — already has offline demonstrations but was hard to discover or return from without navigating through onboarding.

## Implemented

- `/learn` is a purpose-built six-stage Learning Hub describing the actual **design intent** of the MONIFlow financial operating layer. It explicitly distinguishes provider confirmation and Money Space internal bookkeeping from simulated demo outcomes.
- Two direct actions open the existing `/demo/walkthrough` and `/demo/operator` screens. Both continue to support only the published canonical sample command, not arbitrary natural-language instructions or real provider money workflows.
- Signed-in Home now links to the hub; public Welcome links to it as well. Returning from either practice screen goes back to `/learn`, not onboarding. The hub's exit sends signed-in users back to guarded read-only Home and others to Welcome. No JWT, identity, balance or bank detail is passed in navigation parameters.
- `learning-mode.ts` contains pure educational content and constant false capability gates (`providerConnected`, `walletSigningEnabled`, `financialOperationsEnabled`, `persistsAccountData`). No API, wallet, signing SDK, approval token, database or persistence code is imported.
- Vitest covers content integrity, all-disabled financial capabilities, anonymous/signed-in return navigation, discoverability from Home and Welcome, and safe practice exits.

## What this does NOT mean

No provider BMONI integration is newly enabled, no personal or synthetic provider balance is read, no actual money instruction is submitted, no real MONI Guard verdict is run, and the sample's hypothetical result is not a settled payment. This milestone does not finish owner identity reconciliation, wallet proof, Nigerian KYC, provider balance or human-authorized execution.

## Acceptance

1. Review source and unit tests; CI must pass TypeScript, Expo web export, all tests and disposable PostgreSQL identity gate.
2. User reviews and squash-merges PR independently.
3. Existing EAS builds do **not** gain this code. No new EAS build or Vercel deployment is approved by this PR.
4. When Android/iOS testing is available: sign in → Home → Learning Hub → walkthrough → hub → Operator example → hub → read-only Home. Also open the hub from Welcome while signed out; verify no route requires BMONI identity and no credential or account amount appears.
5. Provider-backed Phase 33B/34 remains blocked pending independent provider-approved identity evidence, supported physical-device owner proof, and explicit provider read authorization.

References: `docs/MONIFLOW_PRODUCT_SOURCE.md`, `docs/PHASE33B_READINESS_JOURNEY_PREFLIGHT.md`, `docs/PHASE33C_ACCOUNT_SWITCH_ISOLATION.md`, `apps/mobile/services/operator-demo.ts`, `apps/mobile/services/walkthrough.ts`.
