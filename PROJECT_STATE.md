## Figma v1 → read-only Home visual alignment proposal (2026-10-21)

A UI-only candidate branch `feat/figma-v1-readonly-home-20261021` aligns the real authenticated Home with the newly created MONIFlow Figma design (https://www.figma.com/design/Ir1EG2ui7qVhVuSrYoU917). Figma has 26 screen concepts including a safety-correct **account-readiness** variant. The code proposal adds a read-only balance-withheld hero and an expressly offline Learning & Practice operator prompt, while clarifying the signed-in session pill. Existing account owner-scoped isolation, readiness checks, provider ledger boundaries, approvals and BMONI integration are unchanged. **This is a review candidate, not a merged release or provider-ready financial workspace.** No payments, provider reads, KYC, signing, database migration, EAS build or Vercel deployment is authorized. Refer to `docs/FIGMA_V1_READONLY_HANDOFF.md`; code checks, owner review and native visual smoke testing remain separate checkpoints.

## Phase 34D — immutable saved bank destination labels (2026-10-21)

Owner squash-merged PR #48 (approval action order fingerprint) as `34c51de81a6a8803a2a22b3e0beaff4fb70e1010`. Branch `fix/phase34d-immutable-bank-destination-labels-20261021` closes a separate saved-beneficiary substitution risk: SQLite/PostgreSQL bank repositories previously updated the bank provider-account ID behind an existing human-reviewed destination label. Saved verified aliases now have insert-only, idempotent, uniqueness-protected bindings. Changing a beneficiary requires a new saved label; `/api/banks/register` rejects duplicate labels before further provider requests, with typed HTTP 409 even if a concurrent insert occurs. Tests cover immutable bank identity, same-owner label collision, simulated racing registration, independent user isolation and no duplicate preflight provider work. This does **not** cryptographically bind approved Money Plans to provider account IDs; that is a separate subsequent gate. No live BMONI action, financial operation, DB schema migration, Vercel deployment or Expo build. See [Phase 34D](docs/PHASE34D_IMMUTABLE_BANK_DESTINATIONS.md).

## Phase 34C — approval hash binds exact Money Plan action sequence (2026-10-21)

Owner squash-merged PR #47 (single-bank-withdrawal authorization boundary) as `020c6ebd09113b4e8e86f895c86023005b1bf944`. Branch `fix/phase34c-plan-approval-order-integrity-20261021` removes action sorting from the sensitive Money Plan approval hash. Previously changing the plan action-array order while retaining each action's original index could leave the approved fingerprint unchanged despite failing MONI Guard's original sequential-index constraint. Approval is now order-sensitive; reordered pending reviews cannot be approved, already approved plans invalidate and require renewed Guard review/authorization, with targeted regression tests. Canonical sequential plans retain the same digest; legacy out-of-order plans require re-review. **No provider transaction, native signer, production API deploy, database schema edit or APK build.** See [Phase 34C](docs/PHASE34C_PLAN_APPROVAL_ORDER_INTEGRITY.md).

## Phase 34B preflight — single-withdrawal authorization policy (2026-10-21)

Owner squash-merged Phase 34A server Intent Engine hardening PR #46 as `fcb07d4815dbcab83c68143517ec897104951489`. The next source-only safety fix on `fix/phase34b-multi-withdrawal-verification-20261021` closes a first-beneficiary verification gap: a multi-withdrawal Money Plan must never receive an overall DESTINATION pass merely because its first saved bank account is verified. Server-side Guard now blocks more than one external withdrawal; authorization previews, human approval and execution-readiness refuse such plans consistently with the existing execution engine's exactly-one-withdrawal restriction. In-memory repository/API integration tests cover verified and unverified destinations, legacy review/approved states and single withdrawal continuation. No real provider transaction, KYC, wallet proof, database migration, backend deployment or Expo build. See [Phase 34B preflight](docs/PHASE34B_MULTI_WITHDRAWAL_BOUNDARY.md).

## Phase 34A preflight — production Intent Engine fail-closed parsing (2026-10-21)

Owner squash-merged PR #45 (offline Intent-to-Plan handoff) as `63aa38a61beee042d2d008d9cce87b4918d50567`. Rather than extending offline demo-only interfaces indefinitely, new branch `fix/phase34a-intent-parser-fail-closed-20261021` strengthens the **existing Fastify API deterministic Intent Engine**: full-clause withdrawal/beneficiary and allocation matching, strict currency/whole-naira parsing, no accepted prefixes of malformed numbers, rejection of hidden extra actions, and no partial results from an invalid multi-action instruction. Canonical intent examples remain supported, with added security regression tests at parser and HTTP route boundaries. This affects source code only, **not** the deployed API. No provider bank verification, account ownership, BMONI access, native signing, KYC, real money movement, financial permission, EAS build, database write or Vercel deployment is enabled or authorized. CI, code review and a separately authorized backend release remain independent gates. See [Phase 34A hardening](docs/PHASE34A_INTENT_ENGINE_HARDENING.md).

## Phase 33G — Offline Intent-to-Plan Handoff (2026-10-21)

Owner squash-merged PR #44 (Offline Intent Lab) as `14daf149078074abe0a1faa0ee684321a72d00a8`. The new code-only proposal on `feat/phase33g-intent-to-plan-handoff-20261021` connects a fully recognized local teaching instruction to the Money Plan Playground, carrying **only** two whole-naira illustrative amounts and a fixed origin marker through a guarded route. The Playground revalidates the deep-link values before loading them and can restore imported amounts after editing. Blocked, unsupported, provider-read-required and forged inputs never get an imported plan. Tests cover cross-route correctness, untrusted URL parameters, overspending and unconditional financial-disabled flags. No real server Money Plan, BMONI identity, banking verification, personal balance, owner proof, signing, KYC, real approval, funds movement, persistent storage, new Expo build or Vercel deployment. CI and owner review/merge remain independent gates; native smoke testing awaits hardware. See [Phase 33G](docs/PHASE33G_OFFLINE_INTENT_TO_PLAN.md).

## Phase 33F — Offline Intent Lab (2026-10-21)

Owner squash-merged PR #43 (Money Plan Playground) as `fe960f076e39eb8a6afc79aeeda9c023e2df8cf0`. Branch `feat/phase33f-offline-intent-lab-20261021` adds a standalone educational Intent Lab at `/learn/intent` with strictly limited natural-language examples (GTBank withdrawal, Laptop allocation, single or combined), full refusal of partially unsupported commands, explicit recognition-but-no-read for balance/activity requests, and deterministic reuse of the fixed ₦300,000 **fictional** math Playground when valid. Unsupported, malformed and ambiguous phrases do not produce a partial Money Plan; overspending yields a blocked result and hides resulting amounts. No server intent endpoint, bank verification, BMONI native SDK, KYC, saved data, real funds, execution, database modification, EAS build or deployment. The feature is not the production Intent Engine and cannot authorize financial action. CI, review and native user acceptance remain separate gates. See [Phase 33F](docs/PHASE33F_OFFLINE_INTENT_LAB.md).

## Phase 33E — Offline Money Plan Playground (2026-10-21)

Owner squash-merged PR #42 (Learning & Practice) as `e88ae2950cb17d1a37a4b29d0d3458cd30965840`. Continuing code-only work while Android emulator access is unavailable, branch `feat/phase33e-offline-money-plan-playground-20261021` adds `/learn/playground`: an entirely local, three-preset what-if calculator with two editable NGN amounts, fixed fictional ₦300,000 starting balance, separate hypothetical external movement vs. pocket bookkeeping, deterministic validation against overspending, and unconditional `bankDestinationVerified=false` and `financialOperationsEnabled=false`. Invalid or overspending inputs show no resulting balances. Tests and [Phase 33E scope](docs/PHASE33E_OFFLINE_MONEY_PLAN_PLAYGROUND.md) are included. This is **not** a server Money Plan, real MONI Guard `ALLOW`, BMONI balance, signing, approval or transfer. CI, owner review, merge and later physical-device smoke tests remain separate. No new API, identity linking, KYC, DB mutations, EAS APK builds or production deployments.

## Phase 33D — Learning & Practice product journey (2026-10-21)

Owner squash-merged PR #41 as `c33799871b9a417c07ae56928bfc3d89dbaff902`. While native emulator access remains unavailable, branch `feat/phase33d-learning-practice-hub-20261021` adds an intentionally offline six-step `/learn` experience: Intent → Money Plan → MONI Guard → Human Review → Execution Evidence → Financial Memory, with direct guided walkthrough and interactive canonical-illustration Operator links. Signed-in Home and public Welcome expose Learning & Practice; both existing demo exits return to the hub, which safely returns to the read-only account Home or Welcome depending on live sign-in state. Pure educational capability flags keep wallet signing, provider connection, money movement and persistence disabled; no new account state or identifiers cross routes. No new BMONI API, KYC, real provider reads, financial operations, database changes, Expo build or Vercel deployment. CI, merge and future device smoke test remain independent gates. See [Phase 33D Learning & Practice](docs/PHASE33D_LEARNING_PRACTICE.md).

## Phase 33C — owner-scoped workspace account-switch isolation (2026-10-21)

Owner squash-merged Phase 33B preflight PR #40 as `7d3aa428af8795b4b20e860369da0ce67fde69e7`. Continued **code-only** development while Waydroid emulator access is unavailable. Branch `feat/phase33c-account-switch-isolation-20261021` adds a render-time ownership fence and owner-tagged, memory-only account workspace snapshot, ignoring prior-subject or outdated request completions. It protects Home/Pockets/Activity/Profile statuses, reconciliation, and support errors across session changes, with fail-closed tests. No new API routes, native SDK calls, provider access, database writes, identity linking, KYC, money movements, Expo build or Vercel deployment. CI/review, code merge, and future native account-switch smoke tests remain separate gates. See [Phase 33C](docs/PHASE33C_ACCOUNT_SWITCH_ISOLATION.md).

## Phase 33B preflight — read-only account verification journey (2026-10-21)

While access to Waydroid is temporarily unavailable, continued mobile development on branch `feat/phase33b-readiness-journey-20261021`: a deterministic and fail-closed five-stage Profile journey from signed-in MONIFlow identity to BMONI mapping evidence, device wallet proof, Nigeria KYC, and withheld provider financial reads, with specific next-step copy for no mapping, recorded-but-unverified mapping, unresolved manual hold, and unknown/invalid status. Pure evaluator and security-oriented Vitest coverage added; no new backend endpoint, BMONI call, account linking, KYC, signing, balances, money movement, secrets, database mutation, Vercel deployment or APK request. This is not completion of provider-bound Phase 33B or Phase 34. CI, PR review/merge and future fresh native APK smoke test remain independent gates. Details: [Phase 33B preflight](docs/PHASE33B_READINESS_JOURNEY_PREFLIGHT.md).

## Waydroid x86_64 UI-only APK EAS submission — one build accepted (2026-10-20)

Owner squash-merged PR #39 at `9966a86a0575dc721d126a5a80556cc86da2e1ea` and explicitly authorized one Waydroid APK build. Android `com.realxpen.moniflow.waydroid` is separate from physical Android `com.realxpen.moniflow`. Before submission, Expo autolinking Android exclusion was reinforced for `@bkey-inc/bmoni_embedded_sdk` to handle an SDK 57 edge case; default phone configuration remains unchanged. The first one-shot run [39434060256](https://github.com/realxpen/moniflow/actions/runs/39434060256) failed in its initial gate due to shallow Git history, with **zero** EAS requests. The unique preflight retry [39434227662](https://github.com/realxpen/moniflow/actions/runs/39434227662) subsequently passed: one-time approval, TypeScript/static tests, unsigned API 401/disabled financial flags, actual Expo configuration, Android native autolinking SDK exclusion, x86_64 Gradle prebuild, Expo project identity. Exactly **one** EAS `waydroid-x86-apk` request was accepted: [build d45c9566-bb4e-45c0-9221-765299666500](https://expo.dev/accounts/xpen/projects/moniflow/builds/d45c9566-bb4e-45c0-9221-765299666500). **Submission is confirmed, but Expo Finished/artifact ABI/install/cold-start have NOT been verified.** Next: check Expo status, download the actual APK once Finished, confirm `lib/x86_64/libreactnative.so` and no BMONI signer, install in Android 13 Waydroid, test read-only UI/auth/Profile. Do not initiate any additional build under this spent approval. No BMONI wallet/signing or financial operations enabled and no Vercel deploy occurred.

## Waydroid x86_64 UI-only preview proposal (2026-10-20)

The owner's Ubuntu 24.04 / Android 13 Waydroid run confirmed an ARM64-only MONIFlow APK crashes before first render with a missing `libreactnative.so` under ARM translation. An opt-in `waydroid-x86-apk` configuration has been prepared on a feature branch and described in [Waydroid Preview](docs/WAYDROID_X86_UI_PREVIEW.md). Default phone `app.json`, `android-apk` profile, production BMONI SDK, API provider flags and server deployment are unchanged. Preview is a distinct Android package with x86_64 React Native, BMONI Android autolinking excluded, no device signer and no MONIFlow API mutations. **Not merged; no EAS build or APK compilation approved or executed.** Remaining gates: PR CI and review, Expo native autolinking verification, separate owner-approved one-shot build, artifact ABI and Waydroid cold-start checks.

## Phase 33A — One updated Android APK submitted to Expo (2026-10-19)

Owner approved exactly one new standalone Android APK with the Phase 33A Profile BMONI identity reconciliation interface. The approval-gated workflow was merged in PR #38, and its one-shot run [39267182964](https://github.com/realxpen/moniflow/actions/runs/39267182964) succeeded on the first attempt, including TypeScript/source, authenticated route 401, disabled provider flags and existing Expo project checks. Expo EAS accepted **one** `android-apk` build with ID `f0f0da7e-cc6b-412e-b7ee-b0a1b699fbe7`: https://expo.dev/accounts/xpen/projects/moniflow/builds/f0f0da7e-cc6b-412e-b7ee-b0a1b699fbe7. This proves **submission**, not yet Finished/compiled/installable artifact, which must be verified in the owner's Expo dashboard before updating the physical device. The earlier APK stays installed until then. No further Expo build is authorized by this ticket; no BMONI linking, wallet/KYC, transaction, database write or financial feature activation occurred.

## Phase 33A release — read-only identity-review backend READY (2026-10-19)

PR #37 was merged as `7587c88bcc04ea43855c097ba7070e953cff9ed8`; both pre-merge CI jobs passed. A deliberate API-only Vercel production deployment `dpl_CoCeE9nY8LZcvTEj3XJYiMgJ1Bs3` is **READY** and production alias `https://moniflow-api-silk.vercel.app` resolves to this SHA. Read-only `/health/provider` returned 200 with `provider=bmoni`, `partnerRegistrationEnabled=false` and `authenticatedSandboxDemoEnabled=false`. New `GET /api/workspace/reconciliation`, existing `/api/workspace/overview`, and `/api/auth/session` returned **401 to unsigned probes** in production runtime logs, verifying private route enforcement. No signed-in owner read of the new reconciliation endpoint has yet been independently tested. The physical Android APK already installed was compiled *before* PR #37; its Profile does **not** contain the new panel until a separate explicitly approved EAS Android build. No fresh APK, BMONI calls, account/wallet writes or financial activation occurred during this release.

## Phase 33A — Android profile reconciliation preflight (2026-10-19)

The owner's physical Android APK installed and signed in successfully. Vercel production logs proved `GET /api/auth/session` 200; `GET /api/workspace/overview` initially 503 at `schema_ready / DATABASE_AUTHENTICATION`. The owner corrected the private database connection and fresh authenticated `/api/workspace/overview` requests returned HTTP 200. No database password or connection string was read or copied. Production API is still at Phase30 SHA `9e55f61`, pending a separate release of merged Phase31/32 endpoints. Branch `feat/phase33-mobile-reconciliation-status-20261019` adds the strictly validated, read-only Phase32 reconciliation GET and conservative EVIDENCE NEEDED / UNVERIFIED / MANUAL REVIEW card on Android Profile, without provider writes, wallet proof, identity pairing, or funds. A new native build is required to show this panel on the already-installed APK and is **not initiated** by this code. See `docs/PHASE33A_ANDROID_RECONCILIATION_PROFILE.md`.

## Physical Android APK preview — one-time build preparation (2026-10-19)

An owner-requested physical-device Android preview is configured on branch `build/android-apk-one-shot-20261019`. The `android-apk` internal EAS profile uses the same public Supabase and production API configuration as the iOS simulator, explicitly builds `.apk`, and the new one-time workflow is gated by a new approval ticket on `main`. PR CI, workflow release and Expo Gradle compilation/installation are separate gates; no APK exists merely because source config was added. Financial/provider activation remains disabled. See `docs/ANDROID_APK_BUILD_GUIDE.md`.

## Phase 32 — Owner-scoped identity reconciliation preview (2026-10-19)

Branch `feat/phase32-owner-reconciliation-readiness-20261019` adds read-only `GET /api/workspace/reconciliation` using a verified JWT subject and local reservation holds, with no automatic identity linking or financial permissions. Pending/uncertain BMONI provisioning outcomes are held for manual review; persisted mapping never counts as provider ownership proof. An unmatched legacy hold cannot be inferred from a public fixture or user-submitted email. Includes security/unit tests and the checklist in `docs/PHASE32_IDENTITY_RECONCILIATION_READINESS.md`. Phase30 production database 503 remains unverified pending a new signed-in Appetize refresh; Phase31 code is merged but not yet production deployed. This branch is NOT released; no schema changes, external BMONI requests or financial writes occurred.

## Phase 31 — Traceable account-readiness failure handling (2026-10-19)

Branch `feat/phase31-workspace-recovery-20261019` adds per-failure random support references to the authenticated workspace 503 response and corresponding sanitized private Vercel logs, plus strict mobile handling and regression tests. Phase 30 PR #33 is merged and production API READY at `9e55f61`, but a successful post-patch authenticated workspace request is **not verified**; prior log category is outside current Hobby retention. No database permissions, account mappings, provider records, or financial operations change. Phase 31 PR CI, merge, release, native rebuild and Appetize validation are distinct gates. See `docs/PHASE31_WORKSPACE_RECOVERY.md` for test/release checklist and scoped Phase 32–35 milestones.

# MONIFlow Project State

## Phase 30 iOS workspace HTTP 503 — API readiness diagnostics (2026-10-16)

Owner's real Appetize Phase30 session successfully authenticated (`GET /api/auth/session` HTTP 200) but `GET /api/workspace/overview` repeatedly returned HTTP 503 from Vercel runtime. The app withheld balances/activities and displayed unknown readiness; no fabricated data. The API was not awaiting lazy Postgres repository/schema startup before the first SELECT and also swallowed raw DB exceptions, preventing diagnosis. This patch explicitly awaits readiness and logs **only** non-secret, allowlisted error categories and lookup stage while preserving fail-closed 503 and owner-only JWT checks. The exact DB driver cause is still unknown until a new production request after API release. Connected Supabase private mapping/wallet tables exist but are empty; Vercel's `DATABASE_URL` is secret and connection target was not disclosed or modified. Separate RLS-off warning for private schema is documented for future security review, NOT applied. No new native simulator build required for this API-only patch; existing iOS app can recheck. See `docs/PHASE30_WORKSPACE_503_DIAGNOSIS.md`.


## Phase 30 — Authenticated financial workspace and BMONI readiness (2026-10-16)

After owner validated the Phase29 real native Supabase sign-in → production API `API SESSION VERIFIED`, added an **authenticated, owner-scoped, read-only** `GET /api/workspace/overview` that inspects local provider user mapping and managed wallet ownership records by the verified JWT subject. It returns only conservative recorded/not linked/not created/not reverified states, **KYC not checked, providerReadAccess=false, financialOperationsEnabled=false**; does not issue BMONI calls, money reads or provider writes, and fails closed for cross-account records and unavailable DB. Production-mode native Home/Pockets/Activity/Profile now show that account-owned status and withheld financial-data empty states, not the offline demo ledger or eager provider wallet requests. The old screens remain only under `__DEV__`; a verified native session links to the new workspace. Regression tests cover absence of session, cross-user access, account switch, unverified states, and hidden financial data. Both production API deployment and an explicitly requested NEW Expo Simulator build are still needed for runtime verification; merge alone does not deploy the Vercel API or update Appetize. The earlier public BMONI synthetic fixture has **no verified association** with this personal user. Provider KYC, bank/wallet funds and financial transfers remain disabled. See `docs/PHASE30_AUTHENTICATED_WORKSPACE.md`.


## Phase 29 — API production READY; one-time authenticated iOS Simulator preview (2026-10-16)

PR #29 merged as `66a4eaa45142a99a304e08823e7fdaf63f22ea65` and both CI jobs passed. Production API Vercel deployment `dpl_9YRTzkQWv7gLi7Cr7JZJEr6ihswT` is **READY** at exactly that SHA; alias `https://moniflow-api-silk.vercel.app` now resolves to that deployment. Read-only `/health` and `/health/provider` returned HTTP 200; production BMONI partner registration and authenticated sandbox demo remain disabled. The protected `/api/auth/session` requires JWT; an unauthenticated response has not yet been validated end to end through a raw HTTP probe (provider-protected web fetch treated HTTP 401 as an authorization fetch error), so the Phase29 one-time Expo workflow checks for exactly **401 AUTH_REQUIRED** before requesting its simulator build. No JWT-authenticated user session was created by development work. Owner approved building the next milestone; a new, single-use GitHub ticket triggers ONE simulator-only EAS build with the existing Expo project and public Supabase preview configuration. Its GitHub submission and later Expo compilation, Appetize upload and disposable sign-in need independent verification. No real BMONI wallet, customer KYC or money movement is enabled; current website Vercel release remains separately versioned.


## Phase 29 — Authenticated, read-only MONIFlow session (2026-10-16)

Added the existing MONIFlow Supabase project's **public** URL and modern `sb_publishable_` key to EAS `ios-simulator` preview configuration (not `sb_secret_`, service-role or wallet credentials). Existing password Auth flow now routes to native `/auth/session` which requests the new JWT-protected, no-store `GET /api/auth/session` endpoint. API returns only verified user subject, mapping/wallet/KYC `not_checked`, and `financialOperationsEnabled=false`. The app requires exact identity equality with its in-memory Supabase session and fails closed on missing auth, old API versions or contradictory provider readiness. Strict unit/source regressions added. Live production API release, updated EAS compilation and disposable authenticated-device test **remain unverified**; commit/build work alone is not acceptance. No BMONI user mapping, key signing, KYC, onboarding, financial transfer or authenticated financial simulation activation. Current Vercel production issuer/JWKS/audience match this Supabase project and demo activation flag was verified false. See `docs/PHASE29_AUTHENTICATED_SESSION_READINESS.md`.


## Phase 28 — Native experience and real integration readiness (2026-10-16)

Owner successfully launched the [EAS iOS Simulator build](https://expo.dev/accounts/xpen/projects/moniflow/builds/aee7b52f-2ae1-431a-9e02-bef7d012ebd4) on Appetize, swiped through Welcome and demonstrated the full **offline** Operator journey (Intent → illustrative Money Plan → example checks → example acknowledgement → hypothetical result). The flow exhibited stage changes preserving an old ScrollView offset. Phase28 fixes that with an optional native `ScrollView` ref and stage-triggered scroll-to-top; improves progress accessibility and caption legibility. Simulator's Expo build currently lacks public Supabase sign-in configuration, so the Welcome screen now explicitly warns that authenticated navigation is unavailable rather than offering an unusable CTA. The native wallet screen binds its local identity to the signed-in account in non-development builds before any key/proof operation. Pure and source regressions added. **Not yet a real auth test, BMONI wallet test or live transaction.** The public GitHub synthetic sandbox user is not securely mapped; partner registration and authenticated financial sandbox flags remain off. New EAS simulator build after CI/merge required to observe UI updates in Appetize. See `docs/PHASE28_NATIVE_EXPERIENCE_READINESS.md`.


## Phase 27 access-check failure and fix (2026-10-16)

The first manual [EAS Simulator access workflow](https://github.com/realxpen/moniflow/actions/runs/38881412582) failed **before querying Expo eligibility** because GitHub did not install pnpm workspace dependencies. The EAS CLI reported `Failed to resolve plugin for module "expo-router"` while loading `apps/mobile/app.json`. This is **not** a negative eligibility result, token revocation, Apple provisioning failure or app compilation failure. The successful [Expo iOS Simulator build](https://expo.dev/accounts/xpen/projects/moniflow/builds/aee7b52f-2ae1-431a-9e02-bef7d012ebd4) remains unaffected. Fixed the manual workflow to enable Corepack, install pnpm workspace dependencies before EAS CLI, and added a regression test guarding execution order. No access check, simulator session, build or provider financial write is triggered by merging. Re-run the manual read-only eligibility check after CI; interpret only a later successful `AVAILABLE` or `NOT AVAILABLE` result as Expo eligibility evidence.


## Phase 27 — Successful Expo iOS Simulator build; account access check (2026-10-16)

Owner-supplied [Expo build screenshot](https://expo.dev/accounts/xpen/projects/moniflow/builds/aee7b52f-2ae1-431a-9e02-bef7d012ebd4) confirms standalone `ios-simulator` build **Succeeded** (Expo SDK 57.0.0, 7m19s build), completing the compilation milestone. A real simulator launch and BMONI native-wallet behavior are NOT yet proven, and the `.app` cannot be installed on a physical iPhone. Added manual read-only GitHub `MONIFlow EAS Simulator Access — Cloud` workflow to check EAS Simulator availability for linked `@xpen/moniflow` using the existing encrypted `EXPO_TOKEN`; no simulator session is created, so no session runtime quota/charges are incurred by checking. Future browser-hosted simulator session requires its own approval because Expo limits eligibility and session runtime. See `docs/PHASE27_EAS_SIMULATOR_ACCESS.md`.


## Phase 26 — Expo account/project linked; build submitted (2026-10-15)

Github Actions [MONIFlow iOS Simulator run #2](https://github.com/realxpen/moniflow/actions/runs/38753238741) **passed** on Oct 15. Expo authenticated as `xpen`, created [@xpen/moniflow](https://expo.dev/accounts/xpen/projects/moniflow), and returned verified project ID `3d986249-f72b-494b-9ceb-eef8335a5ae0`. EAS accepted **one** iOS Simulator [build request `aee7b52f-2ae1-431a-9e02-bef7d012ebd4`](https://expo.dev/accounts/xpen/projects/moniflow/builds/aee7b52f-2ae1-431a-9e02-bef7d012ebd4). **Final EAS compilation status is not confirmed** because the Expo build page is authenticated and the GitHub runner used `--no-wait`. The `expo.owner` and `extra.eas.projectId` are now permanently saved in `apps/mobile/app.json`. Future GitHub build workflow checks exact owner and project ID, reads project info and explicitly does not auto-create/relink Expo projects. Still no Apple Developer signing, physical-iPhone native build, BMONI wallet proof, KYC, real transfers or Vercel latest-code release. Refer to `docs/PHASE26_EXPO_CLOUD_IOS_SIMULATOR.md`.


## Phase 26 — Expo iOS Simulator cloud-build preparation (2026-10-15)

Added a standalone Expo EAS `ios-simulator` profile under `apps/mobile/eas.json` (simulator, no Apple signing), a manual GitHub `workflow_dispatch` for owner-authorized Expo project linking and **one** cloud simulator build, and regression checks preventing automatic builds, real-device signing or finance setup. The GitHub action uses owner-supplied `EXPO_TOKEN` as a repository **secret** and an Expo owner username in its manual inputs. No credentials, project ID, build artifact or actual iOS Simulator runtime are currently connected or confirmed. The workflow can create/link an EAS project only after manual owner input and reports the projectId for a later reviewed app config commit. This does not make the SDK function on a physical iPhone, bypass Apple Developer signing, recover KYC, or bind the public synthetic BMONI user to a private account. Existing BMONI provider and Vercel release gates remain. Details: `docs/PHASE26_EXPO_CLOUD_IOS_SIMULATOR.md`.


## Phase 25 — Real BMONI custom sandbox registration (2026-10-15)

Added a **manual-only**, cloud-hosted `create-custom-user` action to the existing BMONI GitHub Actions workflow. This makes ONE documented real BMONI sandbox `POST /v1/users` only after exact `CREATE_ONE_MONIFLOW_BMONI_SANDBOX_USER` acknowledgment, on main, first run attempt, and using the reviewed fingerprint-pinned public development API key. The profile is generated per GitHub run (`Moniflow Sandbox`, reserved `example.com` email, synthetic E.164-formatted +234800 phone, deterministic employee/identity IDs); no actual customer contact, BVN, NIN, KYC document, key or funds are used. A successful result yields a real provider `bmoniUserId` in the **public** Actions summary; it must NOT be associated with a personal, KYC, funded or production account. The BMONI sandbox may reject the synthetic phone, and KYC verification of this custom identity is unsupported by BMONI's fixed test personas. Existing shared Bunch Dillon 409 remains unresolved; do not retry it. No provider POST is performed by building or merging; separate user authorization and manual GitHub dispatch are necessary. See `docs/PHASE25_REAL_BMONI_SANDBOX_REGISTRATION.md`.


## Phase 24 production release attempt (2026-10-15)

Following merged PR #20 (`9bf7266`) and successful post-merge CI #311, attempted an API-first Git-connected production Vercel deployment. Vercel Hobby rejected the only publish request with HTTP 402 `api-deployments-free-per-day`, more than 100 deployments, `retryAfter=86400`. No API publish or website deploy occurred, production aliases remain on the prior READY SHA, `AUTHENTICATED_SANDBOX_DEMO_ENABLED=false` (read back before attempt), and BMONI partner registration remains disabled. See `docs/PHASE24_VERCEL_RELEASE_ATTEMPT.md`. Wait for quota reset or explicit plan resolution; never conflate merged development with live deployment or with BMONI identity recovery.


## Phase 24 — BMONI owner-proof and KYC identity readiness (2026-10-15)

Made the native BMONI SDK owner-proof path stricter: validate EVM address, provider challenge fields, a 65-byte EIP-191 signature, and expiry guard before sending managed wallet creation. Nigeria KYC now selects one of BMONI's two *documented* Nigerian sandbox personas, leaves undocumented identity/document inputs empty, and rejects accidental mixed names/phones/BVNs before profile submission, document upload or activation. Existing onboarding 409 halt now includes an explicit safe support email compose path with provider request reference but no financial/identity secrets. Regression tests cover invalid data and challenge aging. See `docs/PHASE24_KYC_DEVICE_READINESS.md`. **No sandbox user ID was recovered, no native wallet or KYC provider request executed, and no production release/financial feature was enabled.** Release and actual identity ownership remain separate gates.


## Phase 23 — Cloud-only BMONI test fixture (2026-10-15)

Built a browser-triggered GitHub Actions sandbox workflow (`.github/workflows/bmoni-cloud-fixture.yml`), requiring main-branch workflow_dispatch and exact explicit acknowledgment for the only permitted write: creating one published BMONI test identity (Bunch Dillon). It uses the public BMONI sandbox key recovered from official HTTPS documentation and checked against a reviewed hash (no secret stored in GitHub or copied out of Vercel). The same workflow supports read-only CNGN connectivity and inspecting one test-user's wallet/balance/KYC/onboarding endpoints with redacted stage results. All provider execution is single-shot; HTTP 409 or uncertain responses halt and require reconciliation. No wallet device signing, KYC submission, transactions, provider registration toggle, private database mutation, or public API endpoint. See `docs/PHASE23_BMONI_CLOUD_FIXTURE.md`. **No live user was created merely by merging the code: the provider-writing workflow is manual and requires separate typed acknowledgment.** GitHub CI must pass before merging.


## Phase 21 — Isolated authenticated demo Pockets and Activity (2026-10-15)

Branch `feat/phase21-sandbox-money-spaces-activity` adds dedicated simulated money-space and activity screens at `/demo/pockets` and `/demo/activity`. Both perform read-only authenticated loads of the separate sandbox ledger, reject stale account responses, check arithmetic and simulation evidence, and never link their data to provider-backed financial tables or imply a settled bank payment. The canonical completed state projects a ₦20,000 Laptop allocation and precisely two simulated activity entries, with ₦240,000 illustrative available funds. The demo screen links to both routes, and `sandbox-view.test.ts` covers invariant violations and pending/reset states. See `docs/PHASE21_SANDBOX_VIEWS.md`. GitHub CI and review required. **Phase 20 live release is still blocked by quota and remains unverified; real BMONI registration, settlement, and production flag are unchanged.**


## Phase 20 — release verification batch (2026-10-14)

Branch `chore/phase20-readonly-release-checks` adds the GET-only production health/security smoke probe and CLI, offline regression checks included in `pnpm test`, and the quota-safe release/authenticated acceptance runbook (`docs/PHASE20_READONLY_RELEASE_CHECKLIST.md`). Vercel domains still resolve to older production deployment IDs; the last release attempt was rejected by Vercel Hobby daily deployment quota. Supabase MONIFlow project is ACTIVE_HEALTHY and `moniflow_private` remains inaccessible to `anon`, `authenticated`, and `service_role`; the separate `isolated_sandbox_demo_v1` table has not yet been initialized. No live runtime smoke has passed, no production flag changed, no new Vercel deployment, no provider transactions, and no real BMONI partner onboarding. Do not merge/deploy or mark Phase 20 complete without passing CI, quota availability, a fresh release gate, and end-to-end disposable-account evidence.


## B2 consolidated milestone — partner-independent identity and evidence readiness (2026-10-14)

Owner requested milestone-based development with one substantial PR per phase instead of small security patches. PR #12 was expanded in-place to include the durable server HMAC key-continuity sentinel, additive SQLite/Postgres schema guards, PII-free SELECT-only `inspectIdentityReadiness()` report (maps, existing/unknown holds, fingerprinted/legacy counts and key state), real PostgreSQL 16 disposable CI for cross-instance atomic identity reservations, hold persistence and digest-only BMONI-format webhook replay evidence. PostgreSQL testing detected and fixed a timestamp precision defect in evidence-store replay validation. **No real BMONI identity recovery, financial success, marketplace payment, refund, payout, custody or production deployment was activated**; historical fingerprinted locks without proven key still require independent operator/provider reconciliation. Treat PR #12 as the **single consolidated B2 review gate**, then prioritize a complete Hustle MVP functional milestone. See `docs/BMONI_B2_CONSOLIDATED_SANDBOX_MILESTONE.md`. CI/owner review required before merging.

## Phase B2 — Phone HMAC key continuity (2026-10-14)

MONIFlow PR #11 merged at `c6230bd` with premerge CI passing; post-merge CI check was still running at initial verification. New branch `feat/bmoni-phone-key-continuity-guard` closes the key-rotation bypass: a durable private singleton stores a domain-separated HMAC marker bound to the server phone-fingerprint secret. `createOrFindMapping` requires matching marker before returning persisted mappings or issuing any provider user-create request. SQLite `BEGIN IMMEDIATE` and PostgreSQL transactional advisory locking serialize initial marker binding. If historical phone fingerprints exist without a marker, registration fails shut pending reviewed key provenance; no reset/rekey/unlock path. Tests cover restart key mismatch, shared database first use, and preserving unmarked historical holds. This is not BMONI sandbox user ID recovery, provider evidence or actual money movement. No BMONI network calls, financial provider enablement or production deployment. See `docs/BMONI_B2_PHONE_KEY_CONTINUITY_GATE.md`. New PR/CI pending.

## Phase B2 — Atomic keyed phone reservation (2026-10-14)

Owner confirmed MONIFlow #10 merged as `995c14d`, with pre/post-merge CI green. New branch `feat/bmoni-atomic-phone-identity-reservation` closes a remaining local identity alias: different emails/local user IDs sharing one normalized E.164 phone. A **private, mandatory server-only HMAC-SHA256 secret** creates a deterministic pseudonymous fingerprint; SQLite/PostgreSQL add unique partial indexes and an additive migration preserving historical held identities without inferred phone data. BmoniUserService compares phone fingerprints on existing mapped identities, checks other-email reservations and requires one atomic unique pre-dispatch claim; negative tests cover missing keys, phone alias races, restart, different-phone identity conflicts and schema migration. NO production enablement, BMONI provider requests, financial activity or automatic 409 recovery. Historical holds lacking phone fingerprints, real phone ownership, and secret rotation remain separate provider/operator verification requirements. See `docs/BMONI_B2_PHONE_IDENTITY_RESERVATION_GATE.md`. PR/CI pending.

## Phase B2 — Atomic pre-dispatch identity reservations (2026-10-14)

Merged MONIFlow PR #9 at `9fbe6e7`, post-merge CI pending at the start of this checkpoint. New branch `feat/bmoni-atomic-create-reservation` addresses the remaining duplicate-create race: SQLite/Postgres `reserveBeforeCreate` atomically claims a normalized email and unique localUserId **before** external `POST /v1/users`. Only the winning request may make the call; concurrent attempts, crashes or remote failures leave a persistent manual `PROVIDER_OUTCOME_UNKNOWN` hold. A provider 409 refines the state to `PROVIDER_USER_EXISTS`. Verified successful mappings remain reusable. Tests cover competing independent SQLite connections, cross-email local ID conflict, crash gap, and failed-provider no-repeat calls. Production BMONI onboarding still locked; never guesses recovery endpoints, moves money or contacts BMONI. Known remaining risk: independent identities sharing the same phone number across different local emails require separate provider-supported recovery/idempotency assurance. See `docs/BMONI_B2_ATOMIC_REGISTRATION_GATE.md`. New PR/CI pending.

## Phase B2 — Persistent identity recovery holds (2026-10-14)

Owner approved and merged B1 MONIFlow #8 at `4a8b114`; exact merged-main CI passed. B2 feature branch `feat/bmoni-durable-identity-reconciliation-holds` closes a safety gap: a previous provider 409 or uncertain create-user attempt must block later `POST /v1/users` attempts after process restart. Both SQLite/Postgres mappings gain permanent operator-review-only holds (PROVIDER_USER_EXISTS, PROVIDER_OUTCOME_UNKNOWN); BmoniUserService records them for upstream 409, timeouts, malformed/mismatched responses and mapping-persist failures, before returning non-retryable errors on repeats. Existing validated local mapping still works. Tests cover 409, outcome unknown, mismatched identity, cross-user hold attempts and SQLite restart. This is not a BMONI user lookup or recovery solution; no guessed provider endpoint, real provider call, credentials, wallet activation, payment processing or live production deployment. **Concurrent first-ever requests are not yet protected by reserve-before-dispatch and production onboarding remains locked.** See `docs/BMONI_B2_IDENTITY_RECOVERY_HOLD_GATE.md`. PR/CI pending.

## BMONI Webhook Evidence Foundation — Phase B1 (2026-10-14)

Following owner-confirmed merge of Hustle #114 and initial BMONI merchant capability source audit, MONIFlow branch `test/bmoni-webhook-evidence-foundation` implements a **test-only fixture verifier** grounded in documented partner-scoped `employee.deposit.*` and `employee.withdrawal.*` names. It checks raw-body `X-Webhook-Signature` unprefixed hex HMAC-SHA256, `X-Webhook-Id` consistency, strict signed envelope, stores only immutable digest metadata in SQLite/Postgres, deduplicates stable IDs and keeps `providerSettlementConfirmed=false`. Endpoint requires explicit opt-in, NODE_ENV=test and moniflow-sandbox provider; normal deployments never register it. No actual BMONI webhook, subscription, production keys, user identity, refund/payout rail, client Order payment, financial provider request or custody evidence. PR/CI pending; see `docs/BMONI_WEBHOOK_EVIDENCE_FOUNDATION_B1.md`.

## Hustle receipt outbox delivery — Test-only Phase 03 (2026-10-13)

Owner approved merged MONIFlow #6 (298f87c) and Hustle #111 (14a8dbe). Branch feat/hustle-receipt-delivery-outbox adds a SQLite/PostgreSQL durable recovery queue for authenticated `operation.received` notifications, atomic 30s lease, at-least-once retries with finite attempt cap and an explicitly invoked test-only sender restricted to 127.0.0.1 Hustle sandbox inbox. The sender never executes BMONI/PSP, changes money or starts automatically. The existing command store remains RECEIVED-only; new test demonstrates crash replay protection and queue recovery. CI/PR pending; docs/HUSTLE_RECEIPT_PUSH_OUTBOX_SANDBOX.md.

## Hustle signed command-receipt evidence — Phase 02 (2026-10-13)

Following Hustle PR #110 merged at 3ca7ef2 with 3/3 CI passed, this MONIFlow branch adds a sandbox-only, opt-in signed readback endpoint for persisted `RECEIVED` commands. HMAC covers exact return payload bytes (domain-separated from signed request authentication); readback includes amount, command digest, operation/event ID and `simulated=true`, `executionStarted=false`, `realFundsMoved=false`. No payment success, provider evidence, outbox push, bank API call or financial movement exists. MONIFlow and Hustle remain independent financial domains. CI and review pending; see `docs/HUSTLE_SIGNED_RECEIPT_V1.md`.

## Hustle Partner Sandbox API — Stacked Phase 01 (2026-10-13)

Following owner acceptance/merge of Hustle P0 #107 and read-only reconciliation #108, a MONIFlow feature branch `feat/hustle-partner-sandbox-auth-api` (stacked on still-open partner-contract PR #3) implements a **disabled-by-default, non-production-only, sandbox-provider-only** HMAC-authenticated partner command intake. Raw-body method/path/timestamp/nonce signatures and persistent replay prevention, operation idempotency and opaque tenant-limited operation reads are added using SQLite/PostgreSQL. POST collection/payout/refund are **only recorded as RECEIVED**, never executed: NO BMONI calls, bank movement, custody, wallet ledger writes, customer fund claims, live deployment or enabled production routes. See `docs/HUSTLE_PARTNER_SANDBOX_API_ACCEPTANCE.md`; CI/PR review pending. Sandbox partner API is an independent track and does not change the MONIFlow hackathon/mobile demo priority.

## Cross-Project Hustle Integration — Phase 00 (2026-10-13)

Owner authorized starting the separate Hustle × MONIFlow payment architecture track without switching on real money movement. Branch `feat/hustle-phase00-partner-contracts` defines strict shared v1 sandbox-only financial operation/event Zod schemas, tests and `docs/HUSTLE_PARTNER_INTEGRATION_V1.md`. No partner HTTP endpoints, money movement, provider changes, KYC changes, or production credentials. Existing MONIFlow demo priority stays intact. Partner authentication, durable operation store and owner-scoped identity authorization remain P0 next-phase work. Hustle owns transaction truth and ledger; MONIFlow coordinates execution only. **PR/CI/merge pending; BMONI user 409 provider blocker unchanged.**


## Current Gate

**Phase 18 — mobile demo hardening is built and green.**

MONIFlow now has a deterministic, provider-aware hackathon path that can run end to end against the explicitly simulated `moniflow-sandbox` provider while preserving the real BMONI adapter and all live-provider safety boundaries.

The current development goal is no longer to add more financial behavior. The next gate is to pull this build onto a real local/mobile environment and prove the complete canonical journey visually and interactively before optional LLM work.

## Canonical Build State

| Area | State | Meaning |
| --- | --- | --- |
| Phases 0–3 — foundation/UI/shell | ✅ Built | Monorepo, API, mobile shell, design system and navigation are established. |
| Phase 4 — BMONI foundation | 🟡 Provider-blocked | BMONI connectivity was proven, but the existing Nigerian sandbox personas return `409` without exposing the existing `bmoniUserId`; real user mapping still needs provider-supported recovery. |
| Phase 5 — device wallet | 🟡 Code built | BMONI native SDK, owner key, PIN, owner proof, managed CNGN wallet and persistence path exist. Physical-device proof is still required. |
| Phase 6 — Nigeria KYC | 🟡 Code built | Nigeria onboarding/KYC path exists; live BMONI completion is not yet proven. |
| Phase 7 — wallet/balance | ✅ Sandbox / 🟡 BMONI | Provider wallet and balance readback work through the provider abstraction. Real BMONI wallet/balance still waits for live identity recovery. |
| Phase 8 — Intent Engine | ✅ Built | Deterministic intent parsing. |
| Phase 9 — Money Plan | ✅ Built | Server-persisted financial consequences using available-to-spend accounting. |
| Phase 10 — MONI Guard | ✅ Built | Deterministic server-authoritative safety rules. |
| Phase 11 — Human Approval | ✅ Built | Persisted approval plus plan fingerprint protection. |
| Phase 12 — Nigerian bank destination | ✅ Sandbox / 🟡 BMONI | Provider-backed bank destination flow exists; sandbox bootstrap supplies an explicitly synthetic verified destination. Live BMONI verification remains unproven. |
| Phase 13 — provider execution | ✅ Sandbox / 🟡 BMONI | Proposal, signing boundary, provider-status tracking and finalization exist. BMONI external completion is never faked. |
| Phase 14 — Pockets / Money Spaces | ✅ Built | Persisted internal bookkeeping for SQLite and Postgres with idempotent allocation. |
| Phase 15 — Financial Memory | ✅ Built | Persisted EXT/INT activity with provider/internal source distinction. |
| Phase 16 — optional LLM | ⏳ Not started | Must remain advisory/interpretive only; deterministic plan/Guard/approval/execution boundaries remain authoritative. |
| Phase 17 — polish | ✅ Core demo polished | Judge-facing mock/static bank and profile states were removed. |
| Phase 18 — demo hardening | ✅ Built | Mobile recovery, foreground refresh, retry states, bounded reads, session checkpoints and bundle CI are implemented. |
| Phase 19 — presentation | ⏳ Next after device proof | Final presentation/demo capture should use the verified mobile path. |

## Financial Provider Architecture

MONIFlow has one product surface and two provider implementations:

```text
MONIFlow mobile
    ↓
MONIFlow API
    ↓
Financial provider boundary
    ├── moniflow-sandbox   simulated development infrastructure
    └── bmoni              real BMONI Embedded adapter
```

`FINANCIAL_PROVIDER=moniflow-sandbox` is permitted only as explicitly simulated infrastructure. UI and API state must continue to label it as simulated.

`FINANCIAL_PROVIDER=bmoni` preserves the real BMONI path. The sandbox provider must never be presented as evidence that BMONI completed a wallet, KYC, bank or transfer operation.

## Canonical Sandbox Demo

The development bootstrap/reset path creates a fresh sandbox workspace without deleting prior history.

Canonical instruction:

> Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.

Expected deterministic accounting:

```text
Opening provider balance     ₦300,000
External withdrawal          -₦40,000
Provider balance              ₦260,000
Laptop internal allocation    ₦20,000
Available to spend            ₦240,000
```

The Laptop allocation is MONIFlow bookkeeping. It is not represented as a separate provider-held sub-balance.

Repeated execution finalization must remain idempotent: the same plan cannot allocate the Laptop amount or write the same Financial Memory event twice.

## Mobile Demo Hardening

The active judge-facing mobile path no longer depends on the old static preview fixtures.

Implemented hardening includes:

- persisted non-secret workspace context using AsyncStorage + Zustand;
- saved `localUserId`, active provider, command, server `planId` and recovery stage;
- no PIN, private key, signature, BMONI API key, BVN/NIN or raw bank account number stored in the recovery session;
- Welcome detects a saved workspace and requires an explicit **Resume workspace** action;
- app restart never automatically enters approval, signing or execution;
- Home is the recovery hub and exposes an explicit **Resume flow** action;
- Money Plan, MONI Guard, approval, execution and result checkpoints update the recoverable stage;
- Home, Profile, Pockets, Activity, Wallet Details, Approval, Execution and Result refresh from authoritative API state after foregrounding;
- provider execution polling prevents overlapping status requests;
- network-bound provider/read paths use bounded mobile requests instead of waiting indefinitely;
- failed refreshes preserve the last successfully loaded screen state and expose explicit retry controls;
- completed Result clears the unfinished-flow marker only when the user explicitly returns Home;
- the obsolete `/bank/select`, `/bank/verify`, `/bank/success` static preview routes were deleted;
- `apps/mobile/constants/mockData.ts` was deleted;
- Profile, bank destination, Pockets and Activity are API-backed rather than static preview state.

## Human Approval and Recovery Safety

Recovery must never bypass the human approval boundary.

A restored session may remember that a flow was being reviewed, but MONIFlow must return the user to a safe visible checkpoint. It must not automatically approve a plan, sign a digest, submit a signature, or infer provider completion after restart/backgrounding.

Approval-sensitive state is protected by the persisted plan fingerprint. If amount, destination, action structure, totals or another approval-sensitive field changes, the prior approval is invalid and the server must require review again.

## BMONI Live Blocker

Both documented Nigerian sandbox personas were already present in the provider sandbox when tested. `POST /v1/users` returned `409` and the response exposed no recoverable provider user ID.

MONIFlow therefore correctly returns `RECONCILIATION_REQUIRED` instead of guessing, creating random replacement identities, or manually inventing a `bmoniUserId`.

The BMONI path remains blocked until the provider supplies one of:

1. the supported way to recover the existing sandbox `bmoniUserId`; or
2. a reset/released Nigerian sandbox persona for the partner account.

Once a real mapping is available, the live verification chain resumes from user mapping → device wallet → owner proof → managed CNGN wallet → KYC → balance → bank destination → provider execution.

## Device Wallet Boundary

Real BMONI device flow remains:

1. create/recover on-device owner key;
2. set or verify the local signing PIN;
3. request BMONI owner-proof challenge;
4. sign owner-proof text with `signMessage`;
5. create managed CNGN wallet;
6. persist only safe owner/provider wallet metadata;
7. later sign proposal raw digest with `signTransactionHash`.

Owner proof and proposal signing are deliberately different:

- owner proof → `signMessage`
- provider proposal digest → `signTransactionHash`

Private keys and the raw PIN remain on-device.

## Provider Result Policy

MONIFlow never declares external movement successful because a local timer completed, a proposal was created, a signature was submitted, or the app restarted.

Provider status remains authoritative:

- provider terminal success → MONIFlow `COMPLETED`;
- provider terminal failure/rejection/cancellation → MONIFlow `FAILED`;
- non-terminal provider state → MONIFlow remains preparing/signing/processing as appropriate.

Internal Pockets/Financial Memory finalization occurs only after the provider execution is confirmed complete by the selected provider implementation.

## Current CI Gate

GitHub Actions **MONIFlow CI #187** passed on the Phase 18 hardening branch head.

Verified gates:

- dependency install ✅
- workspace TypeScript check ✅
- Expo mobile web export ✅
- automated tests ✅

The CI workflow now includes a real `expo export --platform web` gate so typed routes and bundle-level regressions are caught in addition to TypeScript/tests.

## Next Verification Gate

Before optional LLM work, pull `main` locally and prove the complete mobile demo path:

1. start API with `FINANCIAL_PROVIDER=moniflow-sandbox`;
2. launch the native/development mobile build;
3. start a clean sandbox workspace;
4. verify Home shows ₦300,000 available;
5. run the canonical multi-action instruction;
6. inspect Intent → Money Plan → MONI Guard;
7. explicitly approve;
8. complete the clearly-labelled simulated signing boundary;
9. observe provider execution to terminal state;
10. verify final accounting is ₦260,000 provider / ₦20,000 Laptop / ₦240,000 available;
11. verify Financial Memory contains the EXT withdrawal and INT allocation once each;
12. background/reopen the app and verify workspace state refreshes correctly;
13. interrupt a flow, reopen, and verify MONIFlow requires an explicit Resume action rather than auto-continuing;
14. run the flow twice from clean workspaces to verify repeatability.

After this device/demo gate passes, Phase 16 optional LLM intelligence can be added without giving the model authority over Guard, human approval, signing or provider execution.

## Non-Negotiable Architecture Decisions

- Intent Engine represents only supported, explicitly understood user intent.
- AI/LLM output never directly authorizes or executes money movement.
- Money Plan explains consequences before movement.
- available-to-spend = provider balance minus MONIFlow internal allocations.
- MONI Guard is deterministic and server-authoritative.
- Human approval is separate from Guard clearance.
- Device/provider signing is separate from human approval.
- Provider status is the source of truth for external completion.
- Pockets are MONIFlow internal bookkeeping unless a provider explicitly offers equivalent partition semantics.
- No BMONI API key may be exposed through `EXPO_PUBLIC_*` or a client bundle.
- Never store a user's private wallet key or raw PIN on the MONIFlow backend.
- Never use real identity data in BMONI sandbox.
- Never fake BMONI success to unblock the demo.
