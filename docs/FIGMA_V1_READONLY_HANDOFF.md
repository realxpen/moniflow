# Figma v1 review → read-only Home implementation

**Design:** https://www.figma.com/design/Ir1EG2ui7qVhVuSrYoU917

**Scope:** UI-only, sandbox-first, non-production financial access. This is an implementation proposal for review, not a release authorization.

## Design review finding

The Figma demo includes an illustrative ₦300,000 balance and an explicit ₦40,000 withdrawal. Those are valid as clearly labeled **fictional demonstration states**, but they must never be shown in the signed-in account experience as if they were provider-backed.

The current production path in `AuthenticatedWorkspace` intentionally reads the MONIFlow signed-in session and local readiness evidence, but **does not** fetch a BMONI balance, activate a wallet, link an account or execute a payment. A recorded BMONI mapping is not proof of provider ownership, and signed-in API success is not wallet/KYC approval.

The Figma file now contains **26** unique screens, including the new **26 · Account readiness / not verified** screen (under the same Money Plans and Safety page) for the real signed-in path.

## Safe design-to-code work proposed

- Introduce `ReadOnlyHomeHero` for authenticated Home, with a large lavender **balance withheld** card rather than a sample naira balance.
- Add a dark, operator-forward education card that routes *only* to the existing offline `/learn` experience. No money command reaches the backend from this CTA.
- Preserve the existing account readiness, verified-session, owner-scoped snapshot isolation and verification-journey cards. Existing tabs still work.
- Change the account pill from **SIGNED-IN ACCOUNT VERIFIED** (ambiguous provider claim) to **MONIFLOW SESSION CHECKED** with a processing-colored state. It must not imply wallet ownership.
- Remove the two duplicated old Home education / workspace blocks in favor of one visually coherent entry point.
- Reuse the app's existing semantic color, typography, spacing and radius tokens. The Figma palette is reference art, not license to globally rewrite production tokens.

## Screen-to-code mapping

| Figma design | Existing route/component | Status |
| --- | --- | --- |
| 26 · Account readiness | `AuthenticatedWorkspace tab="home"`, `ReadOnlyHomeHero` | This PR |
| 06 · Home (illustrative balance) | `(tabs)/home.tsx` development-only legacy demo | Keep gated / never use as authenticated production balance |
| 07 · Intent composer | `/learn/intent`, `/demo/operator` (offline examples) | Existing safe practice only |
| 12 · Money Plan | `/operator/plan`, `/learn/playground` | Keep server vs offline examples separated |
| 13 · MONI Guard | `/operator/guard` | Deterministic checks must remain authoritative |
| 14 · Authorization | `/operator/approve` | No changes to approvals, fingerprints or limits |
| 15–18 · Device/process/result/blocked | `/operator/signing`, `/operator/execution`, `/operator/result` | Never invent provider success |
| 08 · Pockets and 09 · Activity | `(tabs)/pockets.tsx`, `(tabs)/activity.tsx` | Must remain account-owned, never substitute practice data |

## UX review / approval conditions

1. The signed-in Home must have **no fictitious amount** and no operational payment CTA.
2. A checked session must not be styled or phrased as a verified BMONI wallet or balance.
3. The offline learning action must state that it uses **no real funds** and must never call BMONI services.
4. Account switching and stale requests must continue to hide the old owner's information.
5. Error, empty, pending and manual-review states must not be replaced by mock completion screens.
6. No account, credential, bank verification, signing, execution, database, API, deployment, workflow or EAS configuration changes are authorized by this design PR.

## Validation and next gates

- Run existing repository typecheck, tests and lint in CI.
- Perform a visual Android/iOS check after a separate approved build or existing compatible dev client, including accessibility labels and long-text wrapping.
- Do not merge or deploy until source review and CI are acceptable; do not assume this proposal is already the approved design.
- BMONI-backed Home balances should be a **separate, explicitly reviewed** phase after authenticated ownership, wallet/KYC/rail and provider read permissions have evidence.
