# BMONI Source Reconciliation

Last reviewed: 2026-09-04

This file records corrections made after the BMONI sandbox/API documentation was added to the MONIFlow project source. BMONI documentation is authoritative for provider behavior. Where supplied BMONI pages conflict, MONIFlow must not guess or fake a successful provider state.

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

BMONI's sandbox identity matching requires the user record and the later identity verification to use the same documented persona. MONIFlow previously created an `Ayomide` user while using Bunch Dillon's sandbox phone and later Bunch Dillon's BVN. That would deliberately fail identity matching.

The onboarding identity screen now defaults to one consistent documented persona from the first provider call onward:

- firstName: `Bunch`
- lastName: `Dillon`
- email: `bunch.dillon@example.com`
- phoneNumber: `+2348000000000`

The later Nigeria KYC screen uses the same Bunch Dillon persona and BVN `95888168924`.

### Device wallet provisioning

Corrected first-launch wallet setup to use `hasWallet()` before choosing between `walletAddress()` and `initWallet()`.

Owner proof remains an EIP-191 text-message signature using `signMessage`.

Proposal/transaction signing remains a raw digest signature using `signTransactionHash`. These methods are intentionally separate.

### Nigeria KYC profile

The BMONI zero-to-first-send quickstart shows the Nigeria KYC PATCH with both `personalInfo` and `addressDetails`. MONIFlow previously sent only `personalInfo`.

MONIFlow now includes the documented sandbox KYC address fields:

- street
- city
- state
- countryCode

The UI defaults to the Bunch Dillon quickstart values in sandbox and explicitly warns not to use real BVN/NIN values in the sandbox.

### Provider status authority

Nigeria onboarding is considered ready only when BMONI onboarding status reports an active/completed/ready state. MONIFlow must not fabricate readiness.

Before resubmitting the Nigeria onboarding request, the route now checks the existing provider status so an already-ready user is not unnecessarily re-onboarded.

### Sandbox funding

Sandbox wallets begin empty. Test funding is a separate lifecycle step and must be provider-backed. The documented default credit is NGN 1,000 and USD 10. The primary MONIFlow demo must either obtain a larger documented/provider-approved sandbox credit or use demo amounts that fit the real funded balance.

## Confirmed but not yet fully implemented

### Nigeria KYC documents / activation

The supplied BMONI files conflict on exact Nigeria sequencing:

- `The integration lifecycle` says: `GET /kyc/options` → document uploads → `PATCH /kyc` → `GET /kyc/readiness` → `POST /kyc/activate`, and says Nigeria omits biometric and `sumsubLevelName`.
- `Quickstart — zero to first send` shows: `PATCH /kyc` → wallet provisioning → `start-nigeria` → identification + proof-of-address + biometric uploads → poll onboarding status.

Because these supplied pages conflict, MONIFlow does not invent a reconciliation. The current route keeps provider status authoritative and the full document/readiness/activation checkpoint remains unresolved until tested against the live sandbox contract or clarified by BMONI.

### NGN virtual bank account creation

The lifecycle confirms `POST /vba/ngn` is the NGN virtual-account funding action. The supplied lifecycle page does not include the request body, so MONIFlow must not invent it from memory. The existing deposit-account read remains valid, but explicit creation should be implemented only from a source that gives the exact body.

### Nigerian bank withdrawal

The product flow requires bank discovery, account verification, withdrawal-account registration, offramp/proposal creation, approval, raw-digest device signing, signature submission, and provider status verification. Exact endpoint bodies must come from the relevant BMONI NGN rail documentation before implementation.

## Non-negotiable integration rules

- `BMONI_API_KEY` stays server-side.
- Never put the BMONI key in an `EXPO_PUBLIC_*` variable.
- Never persist or transmit the device private key.
- Never use `signMessage` for a proposal `hashToSign`.
- Never use `signTransactionHash` for owner-proof challenge text.
- Never claim a withdrawal is completed until BMONI reports the corresponding successful provider status.
- Never show a demo balance as provider-backed unless `GET /smart-wallets/account/balances` actually returns it.
- Never use real BVN/NIN values in the sandbox when the documentation supplies fixed personas.
