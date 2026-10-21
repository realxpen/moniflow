# Phase 33G — Offline Intent-to-Plan Handoff

Date: 2026-10-21

## Product outcome

Once the user understands a sample instruction in the Offline Intent Lab (`/learn/intent`), they can carry its **two hypothetical whole-naira numbers** into the Money Plan Playground (`/learn/playground`) and edit the result. Before Phase 33G, the Playground always restarted at the default ₦40,000 withdrawal and ₦20,000 allocation, losing the sample values the user had just interpreted.

**This is an educational flow, not a production Money Plan, a MONI Guard ALLOW verdict, wallet action, or real authorization.**

## Changes

- `services/offline-plan-handoff.ts` creates a narrow handoff only from a `RECOGNIZED`, `simulationOnly=true`, `realExecutionAllowed=false` Intent Lab result with no duplicated/foreign actions, verified bank claims, inconsistent amounts or invalid arithmetic.
- The navigation payload contains exactly the fixed origin discriminator `source=intent-lab`, numeric `withdrawal`, and numeric `allocation`. No free-form instruction, personal bank account, authenticated user ID, access token, wallet address, PIN, signature or approval data is carried.
- `readOfflinePlanHandoff()` treats URL/deep-link parameters as **untrusted** (arrays, forged origin, zero-action/no-op, malformed/oversized numbers and overspending are rejected). The Playground re-evaluates the amounts with its existing strict pure calculator before allowing any imported values.
- The Intent Lab shows a navigation action only for a fully recognized, mathematically valid example. Blocked, unsupported and provider-read-required requests never receive a plan shortcut or a partial plan.
- The Playground shows that the amounts came from the offline Intent Lab and offers `Restore amounts from Intent Lab` after editing. Invalid/missing URL handoffs fall back to the ordinary fictional Playground defaults.
- Unit tests cover single and combined actions, action-order preservation, parser flag spoofing, bank verification spoofing, tampered preview amounts, direct deep links, negative/invalid/overflow/overspending values, and the absence of financial, storage and signing dependencies.

## Why this stays isolated

The fixed fictional ₦300,000 balance never leaves the educational arithmetic engine. GTBank and Laptop are example labels; neither implies a linked bank, Money Space, BMONI identity, provider held funds, bank verification or real human approval. No network request, BMONI SDK call, wallet creation, payment, KYC/identity mutation, provider balance, bank account identifier, local persistent storage, database write or production deployment is introduced.

## Acceptance gates

1. CI must pass TypeScript, Expo web export, all Vitest suites and the disposable PostgreSQL identity gate.
2. Owner reviews and squash-merges the PR separately. **A source merge is not an Expo APK build.**
3. No new EAS build, production Vercel deployment, BMONI sandbox call, or real financial operation is approved by this change.
4. When Android/Waydroid access returns, smoke test: Learning Hub → Intent Lab → recognized withdrawal/allocation → Playground with matching values → edit → restore; verify unknown bank, read request, invalid/overspending examples have no handoff action, and direct invalid links ignore imported amounts.
5. Future production intent-to-plan execution remains behind independent verified identity, physical supported device wallet ownership proof, provider read access, MONI Guard, bank beneficiary verification, explicit human authorization and separate release approval.

Project references: `docs/MONIFLOW_PRODUCT_SOURCE.md`, `docs/PHASE33D_LEARNING_PRACTICE.md`, `docs/PHASE33E_OFFLINE_MONEY_PLAN_PLAYGROUND.md`, `docs/PHASE33F_OFFLINE_INTENT_LAB.md`.
