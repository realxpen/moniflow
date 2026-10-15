# Phase 23 — BMONI sandbox test identity in GitHub Actions (cloud only)

**Date:** 15 October 2026. **Scope:** documented BMONI shared-key development environment. **No local commands required.**

## Precondition confirmed

The prior `MONIFlow BMONI Cloud Read-Only Probe` ran against the deployed MONIFlow API on 15 October and passed all three gates: API production health, live BMONI sandbox supported-currencies GET, and public partner registration disabled. See [run #1](https://github.com/realxpen/moniflow/actions/runs/38718791033). This confirms connectivity only, not onboarding or money movement.

## What this phase builds

The owner can initiate a separately controlled test from the **GitHub web interface**:

[Actions → MONIFlow BMONI Sandbox Fixture — Cloud](https://github.com/realxpen/moniflow/actions/workflows/bmoni-cloud-fixture.yml)

1. **connectivity (read only)** — call `GET /v1/smart-wallets/supported-currencies`, require `CNGN`. Uses the public shared sandbox key, fetched from BMONI's official HTTPS documentation at runtime and verified against its reviewed SHA-256 fingerprint. If documentation is unavailable or the key changes, **stop**. No key is stored in GitHub, published into a workflow log or copied from Vercel.
2. **create-fixture (one sandbox POST)** — selects exactly one documented test persona: Bunch Dillon, `bunch.dillon@example.com`, `+2348000000000`. Requires choosing `create-fixture` AND typing the exact action-specific acknowledgment `CREATE_ONE_BMONI_SANDBOX_TEST_USER` in the GitHub workflow form. Only one `POST /v1/users` is made. On success, GitHub's job summary shows the **sandbox test identity ID**, which is not a MONIFlow app user ID and is needed for subsequent read-only inspection. **Do not enter any personal customer information.**
3. **inspect-user (read only)** — supply the BMONI sandbox test ID from the earlier creation result. Calls the existing BMONI client to read `GET` wallets, balances, KYC readiness and onboarding status. Prints **only PASS/BLOCKED per endpoint**: no personal data, wallet addresses, BVNs, balances, provider bodies, or API keys.
4. **Device ownership is NOT bypassed** — `readyForDeviceProof` remains false until a device-owned test wallet creates an EIP-191 owner signature over an actual BMONI challenge. This phase never generates/stores a private key, signs, deploys a wallet, submits KYC or sends money.

## How to operate (no terminal)

1. After the Phase 23 PR is merged and CI is green, open [the GitHub Action](https://github.com/realxpen/moniflow/actions/workflows/bmoni-cloud-fixture.yml).
2. Pick `connectivity` and select **Run workflow**. The job must pass `CNGN` support before the next action.
3. For one expressly approved BMONI sandbox test identity, select `create-fixture`, leave `bmoni_user_id` blank and enter exact acknowledgment `CREATE_ONE_BMONI_SANDBOX_TEST_USER`; click **Run workflow** **once**.
4. Read the result. On success, note the returned sandbox-only `bmoniUserId` from the job summary.
5. If the create returns HTTP **409** or times out, **do not retry the creation**. The Bunch Dillon identity may already have been used by another developer; contact BMONI to reconcile/access the existing sandbox test identity instead.
6. Select `inspect-user`, paste the verified BMONI sandbox ID into the form, leave acknowledgment blank, and run the read-only check. Empty or malformed IDs are rejected before networking.
7. Record which stages passed. A successful read does **not** mean a wallet is created, KYC passed, an NGN account is funded, or a transfer was settled.

## Guardrails

- GitHub workflow is **manual only** (`workflow_dispatch`), with readonly repository permission, GitHub `main` branch check, test and typecheck before network operations, and concurrency serialization.
- No Vercel deployment, secret export, Supabase financial tables, API route, production feature toggle, partner onboarding, real bank connection, KYC submission, provider proposal signing or funds.
- The sole permitted write is creation of BMONI's **documented sandbox test persona**, once per explicitly approved workflow run. GitHub's workflow history can be rerun manually; **never do so after uncertain outcomes**.
- Test fixture ID appears in GitHub job summary only on successful creation, so do **not** repurpose this harness for private customer identities. GitHub's public logs and inputs are not a customer data store.
- The shared key is a publicly documented **sandbox-only** credential. A dedicated MONIFlow partner key will eventually be needed for production and for user-specific shared key operations.

## Next after identity verification

**Device-safe wallet ownership:** Implement/use an actual device-held signer, get an EIP-191 challenge and sign it with the device. BMONI's documented `POST /smart-wallets/create-managed` cannot be completed correctly without matching owner proof. After wallet verification, use *sandbox-only* identity fixtures and partner guidance for Nigeria KYC and onboarding. Finally request sandbox tokens for money-movement testing; no automatic funding is implied.

### Documentation

- [BMONI sandbox quickstart](https://embedded-docs.bmoni.com/api-quickstart/)
- [Sandbox API introduction and shared sandbox key](https://embedded-docs.bmoni.com/api-reference/introduction/)
- [BMONI integration lifecycle](https://embedded-docs.bmoni.com/lifecycle/)
- [Sandbox identity test data](https://embedded-docs.bmoni.com/api-reference/sandbox-test-data/)
- [Request test tokens](https://embedded-docs.bmoni.com/request-test-tokens/)
