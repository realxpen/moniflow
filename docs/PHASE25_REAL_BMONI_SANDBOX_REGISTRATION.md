# Phase 25 — Create one *real* BMONI sandbox user (not a simulated ledger user)

Date: 2026-10-15. Deployment: GitHub Actions cloud runner only. BMONI host: `https://embedded-dev.bmoni.com`.

## Why this exists

The documented Bunch Dillon test identity returned **HTTP 409 Conflict** from BMONI in the original manually approved `create-fixture` workflow. BMONI did not return an existing `bmoniUserId`. We must not automatically retry it or claim it belongs to MONIFlow.

BMONI's integration documentation explicitly describes `POST /v1/users` as the real provider user-creation call and says that successful registration yields a `bmoniUserId`. BMONI's separate Nigerian KYC sandbox recognises only specific documented identities (Bunch Dillon and Samson Jabo), and matching name, phone and BVN values are required for their KYC. Therefore **a successful unique registration would confirm a real BMONI sandbox account, NOT verified Nigerian KYC or a working managed wallet**.

## Browser-only process

Open [GitHub Actions → MONIFlow BMONI Sandbox Fixture — Cloud](https://github.com/realxpen/moniflow/actions/workflows/bmoni-cloud-fixture.yml).

1. Select **Run workflow** and the `main` branch.
2. In `action`, select **`create-custom-user`**. Do not select `create-fixture`: Bunch Dillon already collided.
3. In `acknowledgment`, enter exactly `CREATE_ONE_MONIFLOW_BMONI_SANDBOX_USER`.
4. Leave `bmoni_user_id` empty. Click **Run workflow** **ONCE**.
5. GitHub checks the code and safety tests. Only then does its runtime fetch the SHA-256-pinned, public BMONI development key from the official docs and make one `POST /v1/users` to the development host.
6. On success, the **GitHub Actions job summary** includes the actual BMONI `bmoniUserId` plus the synthetic test email and phone. It is a provider-created sandbox account — **not** a simulated MONIFlow user and **not** a signed-in MONIFlow mapping.
7. Check the result before any other operation. If status 400, 409, 5xx or ambiguous timeout occurs, **STOP** and bring the error to the discussion; never rerun the failed job or launch another create without reviewing why it failed. A 409 does not disclose the existing user ID.
8. After confirmed success, use the separate manual `inspect-user` operation with exactly the successful run's `bmoniUserId`. It issues only wallet/balance/KYC/onboarding reads. It may fail because a newly created user does not yet have a managed wallet or activated rail.

## Exact non-personal synthetic identity

The workflow itself derives the details from GitHub's unique run ID, with no sensitive user input:

- `firstName: "Moniflow"`; `lastName: "Sandbox"`
- `email: "moniflow.sandbox.<GITHUB_RUN_ID>@example.com"` (IANA-reserved example.com; **not** a deliverable personal email)
- `phoneNumber: "+234800<last-seven-digits-of-GITHUB_RUN_ID>"` (synthetic E.164-formatted sandbox test number derived from the run ID; the provider is **not** guaranteed to accept it or to have reserved it)
- `employeeId: "MF-CLOUD-<GITHUB_RUN_ID>"`; `identityId: "moniflow-cloud-<GITHUB_RUN_ID>"`
- **No** BVN, NIN, address, OTP, real email, actual customer's phone, photo, or private keys.

Generated identities are synthetic for BMONI's **development** environment only. They must never be submitted to production or used as a substitute for valid Nigerian KYC.

The workflow rejects `GITHUB_RUN_ATTEMPT != 1`, unauthorized events, non-`main` refs, missing exact acknowledgment, a supplied user ID, any host other than the BMONI dev URL, and unknown actions.

## Public-repository caution

MONIFlow's GitHub repository is **public**. A successful job summary containing the test-only BMONI ID and synthetic profile is visible to repository visitors. This ID is **not a secret** in this workflow: do not attach identity documents, funds, real persons or personal data to it. **Before testing wallet ownership, funding or real identity**, a secure and private BMONI partner-scoped identity/mapping and dedicated sandbox key must be established. We will not auto-bind this public fixture to a signed-in MONIFlow account or bypass production onboarding gates.

If a non-public user ID and private bank/KYC workflow is needed, use an access-controlled provider sandbox workflow rather than this public GitHub job.

## Not included

- No public MONIFlow API endpoint, no Vercel production deployment, no promotion of the public sandbox key to production.
- No native wallet keys or signing, wallet creation, KYC/document upload, rail activation, demo-ledger deposits, real funds, transfers, withdrawals or arbitrary transaction execution.
- The existing isolated MONIFlow simulation remains explicitly simulated and separate.
- The `AUTHENTICATED_SANDBOX_DEMO_ENABLED` and `BMONI_PARTNER_ONBOARDING_ENABLED` flags remain off.

## Source of truth

- [BMONI API quickstart — zero to first send](https://bkey.mintlify.site/api-quickstart)
- [Sandbox test data / persona-matching rule](https://bkey.mintlify.site/api-reference/sandbox-test-data)
- [Integration lifecycle](https://bkey.mintlify.site/lifecycle)
- [BMONI sandbox account conflicts](https://bkey.mintlify.site/api-reference/errors)
