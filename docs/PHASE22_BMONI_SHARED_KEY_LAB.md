# Phase 22 — Controlled BMONI shared-key sandbox lab

**Status:** Code-only, opt-in. This is a local developer test harness, **not** production partner activation and **not** the authenticated simulated ₦300,000 MONIFlow demo.

## Default workflow — Cloud only (no local setup)

MONIFlow is managed through GitHub and Vercel. **The default operator workflow does not require a laptop or `.env` file.** This is the first checkpoint, and it is intentionally read-only.

1. **The cloud probe runs automatically once its files are merged to `main`.** It can also be rerun from GitHub **Actions → MONIFlow BMONI Cloud Read-Only Probe → Run workflow**. No local setup, new secret or production deployment is required.
2. GitHub's cloud runner issues GET requests only to the already-deployed Vercel API: `/health`, `/health/bmoni`, `/health/provider`.
3. The deployed API—**not the GitHub runner**—reads its existing `BMONI_BASE_URL` and `BMONI_API_KEY` settings and requests BMONI supported currencies. GitHub never needs, fetches, downloads or logs the shared key.
4. A pass confirms server-to-server BMONI sandbox connectivity, correct provider selection, production Node environment and `BMONI_PARTNER_ONBOARDING_ENABLED=false`. A failed job is diagnostic only, **not** authorization to enable public user creation.
5. The GitHub Actions run prints only sanitized stage results. Any real sandbox user creation or wallet write remains outside the cloud probe and requires a separate reviewed cloud-operated workflow with an explicit approval gate.

Direct browser-accessible run: https://github.com/realxpen/moniflow/actions/workflows/bmoni-cloud-readonly.yml

This public health probe performs a real BMONI API read **only if** the deployed API has selected the BMONI provider and valid existing credentials. It does not prove who owns the credentials or that a dedicated partner key was issued. It never executes the isolated `/demo/live` simulated financial actions.

## Optional developer-local diagnostic (not required for project progress)

The original `lab:bmoni` CLI remains useful as an optional development test harness. **You do not need to run it locally to complete the initial cloud connectivity checkpoint.** The sections below document it for future authorized developer use; they are not instructions for the MONIFlow owner to install anything.

## Why this exists

BMONI's official quickstart documents a shared sandbox API key that works only with `https://embedded-dev.bmoni.com`. It explicitly permits sandbox exploration before a dedicated production key is issued. Sandbox user/wallet creation is part of the documented lifecycle, but this shared credential must never become open public user provisioning. The BMONI API supports the lifecycle **user → wallet → KYC → rail → fund → money movement**, with separate device signing.

References:
- https://bkey.mintlify.app/api-quickstart.md
- https://bkey.mintlify.app/api-reference/sandbox-test-data.md
- https://bkey.mintlify.app/api-reference/kyc-nga-requirements.md
- https://bkey.mintlify.app/request-test-tokens.md

## Built milestones

1. **Key and environment isolation:** Uses the existing server-side `BmoniClient`, whose config requires HTTPS and the exact `embedded-dev.bmoni.com` host. Key is read from local environment, never hardcoded or printed. `MONIFLOW_SHARED_KEY_LAB_ENABLED=true` is required. Production, CI, GitHub Actions and Vercel runtimes are refused.
2. **Read-only connection test (`health`):** Calls the documented supported-currencies GET endpoint and checks the response contract. No user creation.
3. **Scoped sandbox inspection (`inspect`):** Reads **one known** `BMONI_LAB_USER_ID` using existing BMONI gateway methods: wallets, balances, KYC readiness, onboarding status and Nigerian banks. Logs only pass/fail per endpoint, never raw identity, BVN, balances or provider payloads.
4. **One-shot fixed sandbox user creation (`create-user`):** Sends the published Bunch Dillon *test* persona. Requires explicit per-action confirmation plus the local write switch; no retries. If BMONI reports HTTP 409, stop and reconcile the existing test identity manually; the key and published persona may be shared with other developers.
5. **Owner proof and smart-wallet creation (`owner-proof` then `create-wallet`):** Both need explicit separate approvals. Challenge is for one known BMONI test user and device-owned wallet address; requires **EIP-191 signed message** from the owner device to create the wallet. The lab never accepts a private key or signs anything itself; challenge and signature are transient. No proposal signing or external money transfer is automated.
6. **Offline tests:** Fail-closed environment and per-action gating, payload fixture, no-retry write behavior, redacted read-only inspections, user/address/signature validation, and device-proof forwarding.

## How to run (developer machine only)

Install monorepo dependencies first. From the repository root:

```bash
cp apps/api/.env.example apps/api/.env
# Edit ONLY apps/api/.env locally. Add the shared sandbox API key
# from BMONI's official quickstart. Never commit that file.

pnpm --filter @moniflow/api lab:bmoni health
```

By default `MONIFLOW_SHARED_KEY_LAB_ALLOW_WRITES=false` and `BMONI_PARTNER_ONBOARDING_ENABLED=false` (leave public partner onboarding **false**).

### Optional sandbox user creation

Only when ready to create the **exact** Bunch Dillon published test fixture, modify the local `apps/api/.env` for one operation:

```dotenv
MONIFLOW_SHARED_KEY_LAB_ALLOW_WRITES=true
MONIFLOW_SHARED_KEY_LAB_CONFIRM=AUTHORIZE_ONE_SANDBOX_USER
```

Then run:

```bash
pnpm --filter @moniflow/api lab:bmoni create-user
```

This makes **one** BMONI sandbox POST request. If it returns a user ID, record it *privately* as `BMONI_LAB_USER_ID` in your local `.env`. If it returns 409, **do not retry blindly**. The fixed persona may already exist on shared infrastructure; use the documented reconciliation approach / contact BMONI support. Reset `MONIFLOW_SHARED_KEY_LAB_ALLOW_WRITES=false` and clear `MONIFLOW_SHARED_KEY_LAB_CONFIRM` after each write.

### Read wallets, balances and KYC

With a BMONI-confirmed test-user ID in your local env:

```bash
pnpm --filter @moniflow/api lab:bmoni inspect
```

This reads only; results show stage pass/fail without KYC or financial payloads. A failed stage is not proof of lost funds; it may be waiting on wallet creation, KYC or permissions.

### Device-owned wallet flow

1. Provision a **sandbox-only wallet on a test device** using the official BMONI React Native SDK; set `BMONI_LAB_OWNER_ADDRESS` locally. **Never copy a wallet private key into the backend, CLI, files, chat or logs.**
2. Set `MONIFLOW_SHARED_KEY_LAB_ALLOW_WRITES=true` and `MONIFLOW_SHARED_KEY_LAB_CONFIRM=AUTHORIZE_ONE_SANDBOX_CHALLENGE`; run `pnpm --filter @moniflow/api lab:bmoni owner-proof`.
3. Transfer the returned challenge message to the **device signer** and sign it using EIP-191/personal-sign (not a raw digest signature). Store only the challenge ID and device-generated signature locally in `BMONI_LAB_CHALLENGE_ID` and `BMONI_LAB_OWNER_PROOF_SIGNATURE`. Challenges expire; if one fails, inspect status before a new request.
4. Change the approval to `MONIFLOW_SHARED_KEY_LAB_CONFIRM=AUTHORIZE_ONE_SANDBOX_WALLET` and run `pnpm --filter @moniflow/api lab:bmoni create-wallet`. This forwards the already generated signature to BMONI. No private key is involved.
5. Clear the write approval and proof signature after use; run `inspect` again.

**Do not** submit the wallet-proof signature as a proposal signature: money-movement signing uses a *different*, raw digest signing method.

## Not enabled by this phase

- No public REST sandbox-user-creation endpoint or activation of `BMONI_PARTNER_ONBOARDING_ENABLED`.
- No BMONI transactions, offramps, provider-signed proposals, or sandbox token funding.
- No end-user KYC submission with sensitive identity data. KYC status is read-only until fixture/consent/security workflow is independently reviewed.
- No changes to Vercel production env, BMONI provider mode, Supabase tables, or the isolated simulated ledger.
- No guarantee that a shared sandbox fixture hasn't already been created by another developer, or that all provider endpoints are accessible with the shared key.

## Next operator checkpoints

**A. Connectivity:** Run the `health` CLI with the current shared API key locally, and capture the sanitized success/fail response. **B. Identity:** Carefully create/reconcile one documented sandbox fixture, then read it with `inspect`. **C. Device wallet:** Verify real EIP-191 owner proof and managed wallet creation with a disposable test device, followed by read-only inspection. **D. KYC:** Check readiness and whether the intended sandbox identity is recognized; add controlled KYC submission only after a correct current API contract and fixture privacy review. **E. Rails/funding/signing:** Request test tokens from BMONI, then test bank rails and approval/signing under a separate explicit operator approval. Never use real money in the shared sandbox.

Phase 20/21 production deployment and their authenticated **simulated** financial journey remain independently gated by Vercel release availability and live end-to-end acceptance.
