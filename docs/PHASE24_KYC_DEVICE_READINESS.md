# Phase 24 — Nigeria sandbox persona consistency, native owner proof and recovery

**Date:** 2026-10-15. **Source:** https://embedded-docs.bmoni.com/api-reference/sandbox-test-data/ and https://embedded-docs.bmoni.com/api-quickstart/.

## Delivered

1. **Accurate test identities:** The Nigeria KYC screen no longer auto-fills an invented Chiamaka/Okafor profile with Samson Jabo's test BVN. Both official Nigerian sandbox personas are available as explicit selections: Bunch Dillon and Samson Jabo. Each selection fills only the documented first/last name, E.164 phone and BVN; unsupported DOB/document details remain blank. The selected identity must remain an exact match before any provider KYC profile submission, document upload or activation. A checkbox confirms the user understands sandbox-only test data. Selecting a fixture **does not** mean MONIFlow owns its provider `bmoniUserId`.
2. **Native wallet signer readiness:** MONIFlow already has `@bkey-inc/bmoni_embedded_sdk` with a native wallet creation, PIN, EIP-191 `signMessage`, and API owner-proof flow in `/onboarding/wallet-native`. Phase 24 adds address/challenge/signature preflight checks and a 9-minute safety age threshold (BMONI says challenges expire after 10 minutes). API `create-managed` now rejects incorrect signature size rather than forwarding it to the provider. No web-side signer or private-key workaround is introduced.
3. **409 recovery in onboarding:** `/onboarding/identity` already stops after provider conflict or uncertain outcome. Phase 24 adds a native/web email compose action for BMONI's developer support, including **only the provider request reference**. It does not invoke a guessed find-by-email API or perform another BMONI user create.
4. **Safety regressions:** Pure tests prevent cross-persona identity mixing, invalid owner addresses, invalid challenges, expired challenge re-use and malformed owner-proof signatures.

## Known gates

- Shared BMONI sandbox fixture `Bunch Dillon` returned a real HTTP 409 in the GitHub-cloud workflow. **No confirmed `bmoniUserId`**. Never repeat creation until BMONI provides a supported reconciliation method and confirms account ownership. No local fixture should be silently mapped into a signed-in MONIFlow user.
- Wallet provisioning still requires an actual iOS/Android development build, a provisioned test device key, correct on-device EIP-191 signature, an authorized BMONI user mapping, and a subsequent provider readback.
- The web build cannot sign. `/onboarding/wallet` remains a truthful native-required boundary.
- KYC **does not execute in this phase**; documented sandbox values are a validation aid, not authorisation or proof of KYC completion.
- Public BMONI partner onboarding remains disabled. No BMONI key, KYC documents, real funds, provider transfers or wallet signing was used in development.
- Production latest-code deployment is a separate deliberate action. `AUTHENTICATED_SANDBOX_DEMO_ENABLED` must remain disabled until the Phase 20 production activation gate, explicit approval and disposable-user end-to-end validation.

## Release/acceptance sequence

1. Ensure `pnpm typecheck`, Expo web export, full tests and disposable PostgreSQL CI all pass and the PR is merged.
2. Deploy current code to Vercel through the existing deliberate release workflow **without changing** the BMONI provider gate or authenticated sandbox feature flag. Confirm API/web READY and correct matching commit SHA; no quota retry-loop.
3. Use read-only `/health`, `/health/provider` and unauthenticated sandbox denial as smoke checks. This is NOT evidence of authenticated execution.
4. Obtain BMONI's reconciliation response with a verified provider test-user ID and ownership scope.
5. On a native test device, complete owner proof and managed-wallet readback; only then proceed with BMONI Nigeria KYC using the matching fixture and authorized sandbox images.
6. Separate release gate required before enabling authenticated financial simulation in production or touching financial operations.
