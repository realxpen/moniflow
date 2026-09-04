# MONIFlow × BMONI Sandbox Runbook

This is the operator checklist for proving MONIFlow against BMONI sandbox without confusing mock state with provider state.

## 0. Before starting

Backend-only environment:

```env
BMONI_BASE_URL=https://embedded-dev.bmoni.com
BMONI_API_KEY=<sandbox key>
DATABASE_URL=<persistent database>
```

Mobile/web:

```env
EXPO_PUBLIC_API_URL=https://<deployed-moniflow-api>
```

Never put `BMONI_API_KEY` in an `EXPO_PUBLIC_*` variable.

## 1. Use one sandbox persona consistently

Preferred demo persona:

- Bunch Dillon
- phone: `+2348000000000`
- BVN: `95888168924`
- NIN: `63184876213`

Do not combine one persona's identity number with another persona's name or phone.
Do not use real personal identity values in sandbox.

## 2. Create/recover the BMONI user

Expected lifecycle result:

- one MONIFlow `localUserId`
- one durable `bmoniUserId`

A provider `409` on duplicate email/phone is not a reason to create another persona. Reconcile/recover the existing user mapping.

Checkpoint:

```text
BMONI API   connected
User        created/recovered
User ID     persisted
```

## 3. Provision the device wallet

Requires a native iOS/Android development build.
Expo Go and the static web build cannot perform the secure native wallet operations.

Flow:

1. initialize BMONI SDK
2. use `hasWallet()` to decide between `walletAddress()` and `initWallet()`
3. request owner-proof challenge for `CNGN`
4. sign challenge text with `signMessage`
5. submit signature to create managed `CNGN` wallet
6. persist only public wallet metadata

Do not confuse owner-proof signing with proposal signing.

Checkpoint:

```text
Device wallet      ready
Owner proof        passed
Managed CNGN       created
Smart wallet ID    persisted
```

## 4. Complete Phase 6 — Nigeria NGN local-account onboarding

Phase 6 is **NGN/CNGN only**. Do not run the separate Nigerian USD Enhanced Due Diligence path here.

MONIFlow's repaired flow is:

1. check `GET /v1/users/{userId}/onboarding/status`
2. if NGN is already active, stop and reuse it
3. `GET /v1/users/{userId}/kyc/bvn-lookup/{bvn}` to confirm the documented sandbox persona — this is fetch-only and writes nothing
4. `PATCH /v1/users/{userId}/kyc` with the Nigeria NGN profile:
   - `personalInfo.firstName`
   - `personalInfo.lastName`
   - `personalInfo.phoneNumber`
   - `personalInfo.dateOfBirth`
   - optional `personalInfo.gender`
   - `address.streetLine1`
   - `address.city`
   - `address.state`
   - `address.postalCode` — 6 digits
   - `address.countryCode: "NGA"`
   - `identificationNumbers: [{ type: "bvn", number: <11 digits>, issuingCountryCode: "NGA" }]`
5. `POST /v1/users/{userId}/onboarding/start-nigeria` with:
   - `bvn`
   - the persisted `ngnWalletAddress`
   - `ngnWalletIndex: 0`
6. read `GET /v1/users/{userId}/onboarding/status`
7. repeat status checks only as needed until BMONI reports NGN active/ready or a provider failure/action-required state

Do **not** run biometric, `sumsubLevelName`, or Nigerian USD EDD as part of the hackathon NGN Phase 6. The Nigeria-specific BMONI page describes those as part of the later USD international-account stage.

Checkpoint:

```text
BVN persona             matched
NGN KYC profile         accepted
Nigeria onboarding      accepted
NGN rail                active/ready from BMONI
```

If the provider returns a failure or action-required state, stop and inspect the provider response. Never locally promote the rail to ready.

## 5. Create/read NGN virtual account

After the NGN rail is active, create/read the NGN virtual account according to the current provider contract.

The current Bkey reference uses:

```text
POST /v1/users/{userId}/vba/ngn
{ smartWalletId }
```

and reads deposit-account details through:

```text
GET /v1/users/{userId}/bank-accounts/deposit-accounts/NGN
```

Checkpoint:

```text
NGN virtual account   issued/available
CNGN wallet           active
```

## 6. Request sandbox funds

Sandbox starts empty.

BMONI's standard test-token allocation is:

- NGN 1,000
- USD 10

The docs permit requesting more for a particular scenario.

For MONIFlow's primary demo, ask for **NGN 300,000** on the same sandbox phone number so the canonical plan can show:

```text
Current               NGN 300,000
External withdrawal   NGN 40,000
Laptop allocation     NGN 20,000
Available after       NGN 240,000
```

If BMONI grants only the standard NGN 1,000 allocation, do not fake NGN 300,000. Either request a larger credit or use a smaller demo amount that fits the provider balance.

Verify funding through:

```text
GET /v1/users/{userId}/smart-wallets/account/balances
```

before attempting a withdrawal.

## 7. Prepare the Nigerian bank destination

Do not hardcode a bank account as verified.

Required provider flow:

1. load Nigerian banks
2. select the exact bank name + CBN code returned by BMONI
3. verify the 10-digit account number
4. capture the exact account-holder name returned
5. register the withdrawal account using that exact holder name
6. persist the provider account id as the saved destination

If the sandbox docs do not provide an approved test bank-account fixture, ask BMONI for one rather than inventing a successful verification response.

Checkpoint:

```text
Bank             provider-listed
Account number   provider-verified
Holder name      provider-returned
Destination ID   persisted
```

## 8. Run the MONIFlow intelligence path

Primary command:

```text
Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.
```

Expected:

- Phase 8 → deterministic `MULTI_ACTION`
- Phase 9 → external 40,000 + internal 20,000
- available after → current - 60,000
- Phase 10 → deterministic guard verdict
- external movement → explicit human authorization required

No BMONI money-movement endpoint should be called before approval.

## 9. Execute the Nigerian withdrawal

After user approval only:

1. create Nigeria offramp with verified `bankAccountId` and decimal `fromAmount`
2. capture proposal id/status
3. perform required proposal approval step(s)
4. fetch proposal `sign-payload`
5. send `hashToSign` to the native device
6. sign with `signTransactionHash` — NOT `signMessage`
7. submit signature
8. fetch provider proposal/status until the provider reports the result

Never mark the UI `COMPLETED` because a request was submitted. `COMPLETED` must come from BMONI status.

## 10. Record the result

Provider-backed activity should record:

- BMONI proposal/reference id
- provider status
- amount/currency
- destination reference
- timestamp where available

MONIFlow-only pocket allocation must remain visibly distinct from a BMONI bank withdrawal.

## Gate before Phase 11

Do not begin Phase 11 until all of these are proven for the same sandbox user:

- API is reachable over public HTTPS from the phone
- backend persistence survives a restart/redeploy
- one `bmoniUserId` is created/recovered and retained
- native owner wallet exists
- owner proof succeeds with `signMessage`
- managed CNGN wallet exists and is persisted
- repaired Nigeria NGN profile PATCH is accepted
- `start-nigeria` is accepted
- onboarding status reports NGN active/ready
- NGN virtual account can be created/read where supported
- sandbox funds are credited
- provider balance endpoint returns the real funded amount
- Home displays that provider-backed amount
- `pnpm install`, `pnpm typecheck`, and `pnpm test` pass

Do not skip any item by substituting fake provider success.
