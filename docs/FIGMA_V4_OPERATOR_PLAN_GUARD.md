# Figma v4 — Operator, Money Plan and MONI Guard

**Editable Figma designs:** https://www.figma.com/design/Ir1EG2ui7qVhVuSrYoU917 (screens 31–34)

## Product and design scope

Align the pre-approval financial journey — deterministic intent understanding, the persisted Money Plan, and deterministic MONI Guard — with the existing Calm Financial Intelligence design system. Use a shared **UNDERSTAND → PLAN → GUARD** visual indicator. This is a navigation cue, not an assertion that BMONI completed a transfer or that an account is provider-verified.

The four Figma screens show intent interpretation, an illustrative ₦300,000/₦40,000/₦20,000 Money Plan, a Guard REVIEW state, and a Guard BLOCKED state. **Every Figma amount is a labeled illustration.** The mobile implementation continues showing only data returned from the persisted plan; it does not populate the app from design examples.

## Frontend changes

- `OperatorJourneyHeader` is shared by `operator/processing`, `operator/plan` and `operator/guard`, reusing the existing back button.
- Stronger lilac Money Plan current balance and charcoal available-after surface; no new calculation.
- Guard verdicts display distinct **ALLOW**, **REVIEW REQUIRED**, **BLOCK** and **UNAVAILABLE** states. REVIEW cannot look like a successful or approved transaction.
- Clear any previous client-side Guard result when checking again, and do not display stale action buttons or rule outcomes while checking. The server still determines the authoritative plan, verdict and allowed state transition.
- Tests assert the navigation stages and UI fail-closed presentation.

## Safety boundary

No change to `parseOperatorIntent`, `prepareMoneyPlan`, `runMoniGuard`, bank verification, approval, provider execution, device signing, backend contracts or storage. All external movements still require exact, explicit human approval. No provider success is manufactured. No new secrets or production features. Native visual/accessibility QA, branch merge, deployment and build remain separate checkpoints.
