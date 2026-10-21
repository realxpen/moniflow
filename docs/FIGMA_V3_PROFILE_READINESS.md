# Figma v3 — Profile and account readiness

**Design:** https://www.figma.com/design/Ir1EG2ui7qVhVuSrYoU917  
**Screens:** 29 · Profile / owner-scoped readiness; 30 · Identity review / manual hold  
**Basis:** `docs/MONIFLOW_PRODUCT_SOURCE.md`, `docs/UI_UX_DIRECTION.md` and the existing `account-readiness-journey.ts` evaluator.

## Why

A verified MONIFlow application session, local BMONI mapping, device wallet record, Nigeria KYC and provider financial-read permission are **five distinct states**. The original Profile rendered the signed-in identity, four general readiness sections, separate reconciliation content, another five-stage journey, and controls as multiple consecutive cards. This proposal keeps the evidence and reduces duplicate explanations into one clear Profile presentation.

## Implementation

- Add `ProfileReadinessPanel` as an editable, screen-oriented React Native composition using existing tokens and buttons.
- It receives only the **owner-scoped**, already validated `ReadinessJourney`, signed-in email for display, and existing callbacks for refresh, API session inspection and sign out.
- Reuse `buildReadinessJourney(overview, reconciliation)` without modifying its evaluation policy.
- The five-stage view shows the precise status and detail of application session, BMONI identity, wallet ownership, Nigeria onboarding, and provider balances/activity.
- The existing manual hold remains distinct, with a caution color and explicit instruction not to automatically retry provider provisioning or link accounts.
- Profile alone receives the new consolidated summary; other tabs retain existing session and readiness sections from PRs #50/#52.
- Keep `selectVisibleOwnerSnapshot`, `canApplyOwnerRequest`, separate Profile-only reconciliation read and secure sign out untouched.

## Non-negotiable boundaries

1. A session badge may say **MONIFLOW SESSION CHECKED** only when `buildReadinessJourney` returns `VERIFIED SESSION`; this is not BMONI ownership.
2. Mapping status `RECORDED ONLY` and wallet status `NOT REVERIFIED` are never shown as provider verification.
3. No manual-review step triggers retry or a money movement.
4. No financial balance, approved destination, account ownership or KYC completion is fabricated.
5. No provider credential, private wallet key or transaction handler is passed to the presentation component.
6. No new BMONI REST or SDK endpoint; no provider linking, balance/activity reads, deployment, migration or EAS build.

## Review and validation

TypeScript, Expo web export, the full test suite and independent PostgreSQL evidence tests must pass on GitHub Actions. Native visual smoke testing and an explicit owner merge decision remain separate gates. This branch is a **code-only review proposal** and not a financial activation.
