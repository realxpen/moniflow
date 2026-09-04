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
2. create/read device wallet address
3. request owner-proof challenge
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

## 4. Complete Nigeria KYC

For MONIFlow's React Native path, use the current Bkey React Native reference sequence:

1. GET KYC options
2. PATCH KYC profile
3. upload identification document
4. upload proof of address
5. GET KYC readiness
6. POST KYC activate with no `sumsubLevelName`
7. POST start-nigeria with BVN + CNGN wallet address + wallet index
8. poll onboarding status until NGN is active

NGN should not use the Global-KYC biometric path in the current RN reference.

Known source discrepancy: one uploaded zero-to-first-send page lists a biometric upload for Nigeria, while the lifecycle and current RN reference say NGN omits it. Do not silently add biometric. If the current sandbox rejects the RN-reference path, confirm with BMONI before changing the implementation.

Checkpoint:

```text
KYC profile       submitted
ID document       accepted
Proof of address  accepted
KYC readiness     ready
KYC activation    accepted
Nigeria rail      active
```

## 5. Create/read NGN virtual account

The current Bkey RN reference creates an NGN VBA with:

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

Verify funding via account balances before attempting a withdrawal.

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

- Phase 8 → deterministic MULTI_ACTION
- Phase 9 → external 40,000 + internal 20,000
- available after → current - 60,000
- Phase 10 → BLOCK / REVIEW / ALLOW based only on deterministic checks
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

## Current blockers before a real end-to-end demo

- API must be deployed to a public HTTPS origin reachable by the phone
- persistence must survive backend restarts/deployments
- Phase 6 needs the complete KYC document/readiness/activation implementation
- a native BMONI development build must be installed on an arm64 device
- sandbox funding must be requested and confirmed
- a provider-approved Nigerian bank destination must be available for verification
- bank/offramp/proposal execution phases are not built yet

Do not skip any of these by substituting fake provider success.
