# BMONI Source Reconciliation

Last reviewed: 2026-09-04

This file records corrections made after the BMONI sandbox/API documentation was added to the MONIFlow project source. BMONI documentation is authoritative for provider behavior. Where generic and currency-specific pages differ, the Nigeria-specific page governs the NGN-only Phase 6 flow.

## Confirmed lifecycle

BMONI integrations follow this dependency order:

1. Create user
2. Provision smart wallet
3. Verify identity / KYC
4. Activate the rail
5. Fund the wallet
6. Move money

A later stage must not be treated as ready merely because an earlier API call returned successfully.

## Corrections applied

### Sandbox persona consistency

BMONI's sandbox identity matching requires the user record and later identity verification to use the same documented persona. MONIFlow previously created an `Ayomide` user while using Bunch Dillon's sandbox phone and later Bunch Dillon's BVN. That would deliberately fail identity matching.

The onboarding identity screen now defaults to one consistent documented persona from the first provider call onward:

- firstName: `Bunch`
- lastName: `Dillon`
- email: `bunch.dillon@example.com`
- phoneNumber: `+2348000000000`

The Nigeria NGN screen uses the same Bunch Dillon persona and BVN `95888168924`.

### Device wallet provisioning

Corrected first-launch wallet setup to use `hasWallet()` before choosing between `walletAddress()` and `initWallet()`.

Owner proof remains an EIP-191 text-message signature using `signMessage`.

Proposal/transaction signing remains a raw digest signature using `signTransactionHash`. These methods are intentionally separate.

### Nigeria NGN KYC profile

The current Nigeria-specific BMONI KYC page defines the NGN local-account profile separately from the later USD Enhanced Due Diligence path.

MONIFlow Phase 6 is NGN/CNGN only. Its saved KYC profile now uses the Nigeria-specific field names:

- `personalInfo.firstName`
- `personalInfo.lastName`
- `personalInfo.phoneNumber`
- `personalInfo.dateOfBirth`
- optional `personalInfo.gender`
- `address.streetLine1`
- `address.city`
- `address.state`
- `address.postalCode` — exactly 6 digits
- `address.countryCode` — `NGA`
- `identificationNumbers[0]` with `type: "bvn"`, the 11-digit BVN, and `issuingCountryCode: "NGA"`

The previous `addressDetails.street` shape has been removed.

The BVN helper lookup remains fetch-only and is used to confirm the fixed sandbox persona before saving the profile. It does not itself count as KYC persistence.

### NGN versus Nigerian USD KYC

The Nigeria-specific documentation is explicit that the two capabilities are separate:

- Stage 1 — NGN local account: triggered by `POST /onboarding/start-nigeria` with `bvn`, `ngnWalletAddress`, and `ngnWalletIndex`.
- Stage 2 — USD international account: later Enhanced Due Diligence using `POST /kyc/activate`, followed by USD onboarding/readiness requirements.

MONIFlow Phase 6 intentionally implements only Stage 1. It must not force the user through Nigerian USD EDD, biometric, occupation, or `sumsubLevelName` requirements just to activate the NGN/CNGN demo rail.

### Provider status authority

Nigeria onboarding is considered ready only when BMONI onboarding status reports an active/completed/ready state. MONIFlow must not fabricate readiness.

Before resubmitting the Nigeria onboarding request, the route checks the existing provider status so an already-ready user is not unnecessarily re-onboarded.

### Sandbox funding

Sandbox wallets begin empty. Test funding is a separate lifecycle step and must be provider-backed. The documented default credit is NGN 1,000 and USD 10. The primary MONIFlow demo must either obtain a larger documented/provider-approved sandbox credit or use demo amounts that fit the real funded balance.

## Still pending after Phase 6

### NGN virtual bank account creation

The lifecycle confirms `POST /vba/ngn` is the NGN virtual-account funding action. Explicit creation belongs to the funding/lifecycle verification step after the NGN rail is active.

### Nigerian bank withdrawal

The product flow requires bank discovery, account verification, withdrawal-account registration, offramp/proposal creation, approval, raw-digest device signing, signature submission, and provider status verification. Those remain future Phase 12/13 work and must follow the NGN rail documentation exactly.

## Non-negotiable integration rules

- `BMONI_API_KEY` stays server-side.
- Never put the BMONI key in an `EXPO_PUBLIC_*` variable.
- Never persist or transmit the device private key.
- Never use `signMessage` for a proposal `hashToSign`.
- Never use `signTransactionHash` for owner-proof challenge text.
- Never claim a withdrawal is completed until BMONI reports the corresponding successful provider status.
- Never show a demo balance as provider-backed unless `GET /smart-wallets/account/balances` actually returns it.
- Never use real BVN/NIN values in the sandbox when the documentation supplies fixed personas.
