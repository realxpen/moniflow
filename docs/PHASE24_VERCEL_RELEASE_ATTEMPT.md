# Phase 24 production release attempt — quota blocked

Date: 2026-10-15. Target: Vercel project `moniflow-api` (API first), then `moniflow` website, both scoped to Swifna Technology Limited Hobby team.

## Evidence

- GitHub PR #20 merged on main as `9bf72662cb2fb5b666c1dc98ed123d57d8cb9778`; CI #311 **passed** both `verify` and disposable PostgreSQL jobs.
- The production API feature flag `AUTHENTICATED_SANDBOX_DEMO_ENABLED` was read directly from Vercel **before the release attempt** and was `false`. The real partner-registration flag has no enabled production variable.
- Prior stable production aliases were READY at earlier source commit `a1b65b1c29bb1f2d6fc4b163e3f5e0bc4508f186`.
- Tried one Git-connected production API deployment at main commit `9bf7266`. Vercel returned **HTTP 402 payment_required** with resource `api-deployments-free-per-day`, message `Resource is limited - try again in 24 hours (more than 100)`, and retryAfter `86400`.
- The API deployment request was **rejected**. The website deployment was **not attempted**, avoiding unnecessary quota retries.
- No simulated-finance feature toggle, BMONI partner onboarding, BMONI user creation, KYC, device wallet operation or money movement was initiated by this release attempt.

## Next release gate

1. Wait until the Vercel Hobby deployment quota has cleared or the owner explicitly chooses an eligible plan. **Do not blindly retry before the provider's retry window.**
2. Recheck latest main SHA, CI, Vercel API environment and project aliases.
3. Deploy API first with the feature flag still disabled, then website. Verify both READY at the same intended SHA.
4. Perform public GET-only runtime checks and unauthenticated authorization denial.
5. Enabling the isolated authenticated simulation remains a **separate** explicitly authorized decision, requiring durable PostgreSQL, JWT readiness and disposable-account end-to-end acceptance. It is **not** activated by publishing code.
6. Real BMONI user ID still requires provider identity reconciliation after the documented Bunch Dillon HTTP 409. Never guess a user ID or use arbitrary KYC documents.
