# Phase 29 — one-time authorized Supabase iOS Simulator preview

Approval: REQUEST_ONE_PHASE29_MONIFLOW_AUTH_IOS_SIMULATOR_BUILD_20261016

The MONIFlow project owner requested **"build next development milestones"** after Phase 28, specifically to connect the existing Supabase authentication project to an iOS Simulator build and test authenticated read-only API access.

This ticket authorizes **one** iOS Simulator cloud build of the now-merged Phase 29 branch and nothing more.

Release scope and prerequisites:

- Expo owner `xpen`; existing project `3d986249-f72b-494b-9ceb-eef8335a5ae0`.
- The `ios-simulator` EAS profile embeds only the MONIFlow Supabase public project URL and modern `sb_publishable_` client key. No service role key, BMONI token, private signing key or customer auth token is involved.
- The GitHub one-time workflow must check that the deployed MONIFlow production API returns exactly `401 AUTH_REQUIRED` for unsigned `GET /api/auth/session`. It must also verify `/health/provider` reports BMONI partner registration and authenticated sandbox demo still **false**.
- Exactly one `eas build --platform ios --profile ios-simulator --non-interactive --no-wait` is permitted on the FIRST creation of this file on the `main` branch. Workflow reruns or later edits to this ticket must not request another build.
- This is not Apple-signed for a physical iPhone; it must not be treated as proof of Secure Enclave signing or provider banking.
- A passing GitHub job means **submitted to EAS**, not that native compilation or app sign-in has succeeded. Expo final status, new Appetize upload and disposable test-user sign-in are separately verified.
- No real person should enter sensitive data in the third-party simulator. BMONI's publicly referenced test fixture is not securely mapped to an authenticated MONIFlow account.
- Do not initiate BMONI user creation, device-managed wallet setup, identity verification, transfers, fund movement or authenticated simulated-ledger activation.
- No automatic additional Expo builds, Vercel website deployment or provider writes are authorized by this ticket.

This file and its workflow are intentionally not reusable. Any later native build requires a fresh reviewed approval.
