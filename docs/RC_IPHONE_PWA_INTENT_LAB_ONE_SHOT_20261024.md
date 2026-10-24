# MONIFlow iPhone PWA — one safe read-only Money Plan instruction preview

Approval: ONE_EXPO_PWA_INTENT_LAB_UPDATE_20261024

**Founder instruction:** Following personal confirmation of the signed-in iPhone PWA, saved example persistence, account isolation, recovery and navigation, the founder said: “ok move forward.” No repeats of the already accepted device checks are required.

**Pinned, verified app source:** `4529e96956d57217a290b254a3214d92398a9199`, squash-merged PR #91 from the previously verified fixed demo. Full PR CI green: TypeScript, canonical real HTTP sandbox test, Vitest, native source-safety, disposable PostgreSQL and web export.

**Change:** Publish one new web-only Expo Hosting preview of the already merged product with the authenticated read-only Money Plan Intent Lab. The user can experiment with supported instructions on existing *fictional* money. The server response has JWT owner checks, complete eight-rule MONI Guard review, arithmetic/ownership validation and no writes. Prior simulated ₦240k available, ₦20k Laptop and two example activities must be preserved in the same isolated database. The old canonical walkthrough is unchanged.

**Release boundary:** one preview update only on `xpen/moniflow` (`xpen-moniflow-pwa-202610` developer domain; `mvp-preview` alias), never production, no native build, no signing, BMONI provider access, KYC, bank transfer, Hustle settlement, new account, ledger reset or write migration. Client `EXPO_PUBLIC_MONIFLOW_PWA_PREVIEW=1` retains its narrow sandbox-only POST allowlist. Use only public Supabase URL/publishable key on web. No secrets are printed.

**Workflow integrity:** release PR introduces exactly this file and `.github/workflows/iphone-pwa-intent-lab-once.yml`. On first main push only, assert previous main equals pinned app commit, parent is exactly the pin, no existing ticket, exact expected changed paths. Detach to pinned app commit; rerun typecheck, all tests and Expo web export, validate installable assets and no privileged provider keys. Publish once using pre-connected Expo project token. A new unique Expo URL must have **its exact origin** allowlisted only on isolated preview backend (never wildcard) and origin/JWT/preflight verified before giving to the founder.

**Provider preview update is separate:** The saved-sandbox API `POST /api/sandbox-demo/preview` from PR #91 must be deployed to the isolated API staging environment with the current JWT/CORS/private PostgreSQL env and asserted to require 401 without bearer authorization, with older PWA origins preserved. Do not publish as functional until staging API route and new PWA origin are independently verified.
