# Phase 28 — Native Operator UX and authenticated integration readiness

Date: 2026-10-16. Source: user screenshots of the first successful Appetize iOS session (iPhone 17 Pro Max), including scroll on Welcome and all six offline Operator stages.

## What was observed on an actual iOS Simulator

1. **Native Expo iOS build** succeeded on EAS (`@xpen/moniflow`, build `aee7b52f-2ae1-431a-9e02-bef7d012ebd4`). The artifact was successfully uploaded to Appetize, launched, and navigated without a crash.
2. **Welcome scroll works with a touch-style swipe** in Appetize. This was not a React Native failure; the ScrollView scroll indicator is hidden. No global scrolling replacement is necessary.
3. **Offline Operator path completed**: sample intent → illustrative plan → example checks → acknowledgement → hypothetical execution → simulated result. The six-stage UI is **not** BMONI transaction evidence. The shown ₦300,000 opening, ₦40,000 illustrative GTBank withdrawal, ₦20,000 internal allocation, ₦260,000 hypothetical provider balance and ₦240,000 available amount are purely in-memory example figures.
4. **UX issue reproduced**: changing stages sometimes retained the previous vertical scroll offset, hiding the new title and leaving users halfway down the next stage.

## Fixes added to source

- `Screen` accepts an optional React Native ScrollView ref. On Operator stage transitions, `useEffect` immediately resets its existing ScrollView to y=0 and retries on the next animation frame after layout, with cancellation on unmount. Scroll behavior on all other screens remains unchanged. No navigation state or demo ledger is reset.
- Operator adds an accessible step count/progress indicator, slightly larger on-screen disclosure and informational labels, and shrink-to-fit right-aligned monetary amounts for narrower displays.
- The **current Expo simulator build** includes `EXPO_PUBLIC_API_URL` but **does not include** `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`. This means login is NOT yet usable there. The native welcome screen now makes this absence explicit and disables the unusable sign-in CTA. It still exposes the offline Operator, clearly labelled as simulated. Client-side configuration does not by itself validate the auth backend.
- Native wallet UI now uses `workspaceIdentity` with the active **authenticated account ID**, not an unchecked deep-link `localUserId` or a GitHub test fixture, before any signing action on non-development builds. A missing/mismatched identity disables wallet creation and displays the account-mapping prerequisite. Existing BMONI signed-owner proof and backend checks remain authoritative; no new device key, wallet or PIN was created.
- Pure Vitest unit tests and repo Node regressions check the account/provider/wallet distinctions, the stage reset, protected identity routing and absence of live-money pathways in the offline Operator.

## Evidence, limits and next acceptance gates

- GitHub CI tests and Expo export must pass before merging. A **new** EAS iOS Simulator build is required to see these fixes in Appetize; the existing uploaded app will not magically update. Request a new build only after confirming source is merged and available Expo build quota, then explicitly upload the new artifact. Do not automatically build or charge Appetize quota.
- We **have not** tested signed-in navigation end to end or authenticated API calls on Appetize. First configure the Expo **preview** environment (via Expo dashboard with verified project ownership), then make a separate reviewed EAS simulator build containing publishable public auth configuration:
  - `EXPO_PUBLIC_SUPABASE_URL`: the project's exact HTTPS Supabase auth URL, without credentials
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: the project's **publishable** client key (not service_role, secret key, refresh token, JWT or wallet secret)
  - Preserve `EXPO_PUBLIC_API_URL=https://moniflow-api-silk.vercel.app`.
- Despite being client-public, configure these in Expo project environment variables rather than sending values in this chat. Do not use live user data in the third-party Appetize simulator. Test with a disposable sign-in identity, verify JWT-authenticated GET-only wallet/profile access and denial for unrelated local IDs. Real provider/KYC/wallet operations remain gated.
- The publicly visible BMONI development user created with the synthetic `example.com` identity is **not bound to a private MONIFlow account**, has no verified wallet owner, and is not supported for BMONI's fixed Nigerian KYC test personas. Never associate it with real funds, real BVN/NIN, Appetize PIN or production actions.
- Wallet signing on Appetize is not secure-enclave proof on an actual iPhone. No real BMONI wallet creation, KYC or transfers performed or enabled.
- Vercel's deployed frontend/API may still lag merged source because of prior Hobby deployment quota; deploying code is an independent step and must not silently enable the authenticated sandbox or partner-registration flags.
