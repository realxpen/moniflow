# Phase 33C — Owner-scoped workspace isolation and account switching

**Date:** 2026-10-21  
**Scope:** Code/test reliability improvement for existing authenticated read-only Home, Pockets, Activity and Profile. This does **not** finish BMONI device-owner verification and does **not** authorize API or financial operations.

## Problem and change

React may render after its signed-in user changes but before the previous component's `useEffect` cleanup resets local state. That single render could briefly display another account's previous workspace status or its support-message text. Multiple concurrent status refreshes on app activation, tab changes or a slow network also risk obsolete completion.

- `owner-workspace-snapshot.ts` wraps workspace state and error messages under the authenticated subject that caused the read.
- `selectVisibleOwnerSnapshot()` is evaluated **on each render**; it returns nothing for sign-out, user change, cross-subject overview, invalid/widened financial claims or mismatched snapshot owner.
- Invalid reconciliation is withheld while preserving a separately verified local workspace. It receives a conservative identity-review error rather than exposing inconsistent provider state.
- `canApplyOwnerRequest()` requires the current in-memory authenticated subject and the latest request version. A response from a different user, a signed-out session or an outdated activation refresh is ignored.
- The Profile still uses the existing validated `GET /api/workspace/reconciliation` only; the general workspace uses existing `GET /api/workspace/overview`. No new endpoint or API mutation.
- `AuthenticatedWorkspace` maintains one subject-scoped, memory-only snapshot. Sign-out clears it before navigating. No data is persisted for this feature.

## Explicit boundaries

MONIFlow sign-in is **not** BMONI identity proof; local BMONI mapping is **not** device wallet ownership; no payment account, balance, KYC, activity, signing key or real transfer is obtained or generated. Pending account review remains manual. Neither `com.realxpen.moniflow` nor `com.realxpen.moniflow.waydroid` is rebuilt by merging this work.

## Acceptance gates

1. `pnpm typecheck`, mobile web export, Vitest, and disposable PostgreSQL CI all pass.
2. Review tests for rapid account A→B switch, sign-out, stale request versions, unexpected subjects, inconsistent reconciliation and financial-flag inflation.
3. Code review and merge are separate steps. No Expo build, API deployment, provider write or production configuration change is included or authorized.
4. When supported Android hardware is available, independently test sign in as account A → Profile → sign out → sign in as B → Home/Profile, plus rapid foreground/background switching under a slow network. Neither A's account status nor A's support reference should appear for B.
5. Actual Phase 33B native wallet-owner proof remains blocked until private verified BMONI identity evidence and a supported physical device are available; Phase 34 provider reads remain blocked.

Links: `docs/PHASE32_IDENTITY_RECONCILIATION_READINESS.md`, `docs/PHASE33A_ANDROID_RECONCILIATION_PROFILE.md`, `docs/PHASE33B_READINESS_JOURNEY_PREFLIGHT.md`.
