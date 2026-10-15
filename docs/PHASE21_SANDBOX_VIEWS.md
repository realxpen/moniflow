# Phase 21 — Isolated simulated money-space and activity readouts

## Scope

Phase 20 production activation remains blocked by the Vercel Hobby quota window. This phase builds **only isolated sandbox presentation surfaces**, so the simulated example can show continuity across dedicated money-space and activity pages once Phase 20 is released.

## Bulk milestones

- **M1 — Read model:** `apps/mobile/services/sandbox-view.ts` projects existing **authenticated** isolated ledger data into internal money-space allocations and simulated activity. It rejects inconsistent balance math, pending-plan activity, duplicated activity references, incorrect source labels, and unexpected status. It never writes any records.
- **M2 — Simulated money spaces:** `/demo/pockets` displays only internal allocations already confirmed by a completed simulated plan. For the canonical command this is the `Laptop` allocation of ₦20,000. It is NOT a separate account or a real MONIFlow Pocket repository record.
- **M3 — Simulated activity:** `/demo/activity` reads precisely the two simulated entries (GTBank withdrawal example and Laptop allocation) after completed simulation. The withdrawal remains **NOT SETTLED** and is not BMONI bank activity.
- **M4 — Account ownership and navigation:** Each screen retrieves current account state with authenticated `loadApiSandbox()`, rejects mismatched user IDs, discards stale in-flight responses across account transitions, exposes read-only refresh, and links back to `/demo/live`. The live demo links to the two new views.
- **M5 — Deterministic regression tests:** Cover initial/no-activity, canonical post-completion amounts, invalid arithmetic, wrong activity source, duplicated entries, and reset behavior.

## Exact canonical result

Opening illustrative provider balance: ₦300,000. Hypothetical bank withdrawal: ₦40,000. Illustrative provider balance after: ₦260,000. Internal Laptop allocation: ₦20,000. Available unallocated: ₦240,000. All amounts are **simulated**.

## Boundaries and release gate

- This phase does **not** modify `apps/api` routes, database schemas, real Money Plans, bank destinations, real Pockets, real Activity or BMONI integration.
- Main bottom-navigation Pockets and Activity remain provider-backed; the new views are accessible only under the isolated `/demo/*` route group.
- It cannot be demonstrated live until the Phase 20 authenticated sandbox endpoint is published, its feature flag enabled, and disposable-account acceptance checks pass.
- Do not trigger an unnecessary Vercel deploy during its 24-hour daily quota cooldown. CI alone never proves live settlement.
