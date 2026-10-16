# Phase 30 — One-time iOS Simulator account workspace preview

Approval: REQUEST_ONE_PHASE30_MONIFLOW_WORKSPACE_IOS_SIMULATOR_BUILD_20261016

The project owner requested building MONIFlow's next development milestone after verifying Phase29 native signed-in sessions, and the Phase30 authenticated account workspace was implemented, reviewed and merged as `f8632270f6f9d4a035bba8ed2cb712388787ccfd`.

This ticket authorizes exactly ONE iOS Simulator cloud build of the new signed-in Home/Pockets/Activity/Profile readiness views using the existing `@xpen/moniflow` Expo project. The workflow must first check live Vercel API `GET /api/auth/session` and `GET /api/workspace/overview` return 401 AUTH_REQUIRED to unsigned callers, and `/health/provider` keeps BMONI partner registration and financial simulation disabled. It must verify Expo project continuity and `sb_publishable_`-only client configuration, and may only submit one `eas build --platform ios --profile ios-simulator --non-interactive --no-wait` on first creation of this file in main. Never automatically retry a job, create another Expo project, change production flags or upload to Appetize.

No Apple Developer paid membership, physical iPhone IPA, wallet creation, KYC, funds, BMONI provider writes or authenticated financial actions. A successful GitHub job means only EAS submission; Expo compilation, updated Appetize upload and owner-controlled native read-only tab validation remain separate steps.

Do not confuse mapping state `recorded` with BMONI provider verification. Balances and Activity are withheld pending private owner verification, provider permission and approved KYC. The public BMONI fixture remains unrelated to the disposable sign-in user.
