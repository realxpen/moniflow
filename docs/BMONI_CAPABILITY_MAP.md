# BMONI Capability Map

Audited against the BMONI source material stored with the project plus the current official Bkey React Native reference. “Implemented” means MONIFlow contains code for the contract. “Verified live” means the flow was actually exercised against the sandbox. Those are deliberately different states.

| Capability | Confirmed contract | MONIFlow status | Live checkpoint |
|---|---|---|---|
| Partner auth | `x-api-key` on every REST request | Implemented server-side only | Not fully re-run end to end |
| Sandbox origin | `https://embedded-dev.bmoni.com` | Enforced | Basic connectivity previously proved only |
| User creation | `POST /v1/users` | Implemented + local mapping | Pending same-user full demo |
| Durable provider identity | persist `bmoniUserId` | Implemented | Pending deployed persistent DB |
| React Native signer | `@bkey-inc/bmoni_embedded_sdk` | Installed / integrated | Native checkpoint pending |
| Owner proof | challenge → `signMessage` → `create-managed` | Implemented | Native checkpoint pending |
| CNGN managed wallet | `create-managed` | Implemented + public metadata persistence | Native checkpoint pending |
| Proposal hash signing | `signTransactionHash(hashToSign)` | Device adapter now exposes method | Execution flow not built |
| BVN sandbox lookup | `GET .../kyc/bvn-lookup/{bvn}` | Implemented | Pending live persona run |
| Full NGN KYC | PATCH + ID + PoA + readiness + activate | **Incomplete** | Blocked until corrected |
| Nigeria rail activation | `POST .../onboarding/start-nigeria` | Implemented call, but currently occurs before the complete KYC sequence | Not valid to mark passed |
| Onboarding status | `GET .../onboarding/status` | Implemented | Pending correct KYC/rail flow |
| Wallet list/detail | account wallets + wallet detail | Implemented | Pending live provider response observation |
| CNGN balance | `GET .../smart-wallets/account/balances` | Implemented | Pending funded sandbox |
| NGN VBA creation | `POST .../vba/ngn` | Not yet implemented | Pending |
| NGN deposit details | `GET .../bank-accounts/deposit-accounts/NGN` | Implemented read | Pending rail/VBA |
| Nigerian banks | `GET .../bank-accounts/nigerian-banks` | Not yet implemented | Phase 12 |
| Account verification | `POST .../bank-accounts/verify-nigerian-account` | Not yet implemented | Phase 12 |
| Withdrawal account registration | `POST .../bank-accounts/withdrawal-accounts/nigeria` | Not yet implemented | Phase 12 |
| Nigeria offramp | `POST .../smart-wallets/{walletId}/offramp/nigeria` | Not yet implemented | Phase 13 |
| Proposal approval | proposal approval step before signing | Not yet implemented | Phase 13 |
| Proposal sign payload | `GET .../proposals/{proposalId}/sign-payload` | Not yet implemented | Phase 13 |
| Proposal signature submit | `POST .../proposals/{proposalId}/sign` | Not yet implemented | Phase 13 |
| Provider completion status | fetch proposal/status | Not yet implemented | Phase 13 |
| Intent Engine | deterministic supported-intent parser | Implemented | Tests committed, runtime run pending |
| Money Plan | provider-balance consequence arithmetic | Implemented | Tests committed, provider run pending |
| MONI Guard | deterministic ALLOW/REVIEW/BLOCK policy | Implemented | Tests committed, runtime run pending |

## Sandbox identity

Preferred MONIFlow persona:

- `Bunch Dillon`
- phone `+2348000000000`
- BVN `95888168924`
- NIN `63184876213`

The source explicitly warns that a valid sandbox identity number used with the wrong name/phone is supposed to fail.

## KYC source discrepancy

The stored BMONI pages are not perfectly consistent about Nigeria documents/order. The lifecycle says Nigeria omits biometric; the zero-to-first-send page includes biometric. The current official Bkey React Native reference says NGN uses identification + proof of address, omits biometric, then readiness → `POST /kyc/activate` with no `sumsubLevelName` → `start-nigeria`.

MONIFlow records this discrepancy instead of inventing a hybrid flow. Because MONIFlow is React Native, the current Bkey RN reference is the implementation target unless BMONI support/current API behavior says otherwise.

## Funding reality

Sandbox wallets start empty. The standard BMONI test-token request credits NGN 1,000 and USD 10, with the option to ask for more for a specific scenario.

The canonical MONIFlow demo needs NGN 60,000 committed and visually assumes NGN 300,000 current available. Therefore the desired sandbox credit request is NGN 300,000. If the provider does not grant it, the UI/demo amount must follow the real funded balance instead of fabricating NGN 300,000.

## Signing invariant

Owner proof and money-movement proposal signatures are not interchangeable:

- owner proof: text + EIP-191 → `signMessage`
- proposal: raw 32-byte `hashToSign` → `signTransactionHash`

This invariant must be enforced again in Phase 13 tests.

## Sources inside the project

- Product source of truth
- BMONI integration lifecycle
- BMONI Embedded overview
- BMONI use cases
- zero-to-first-send quickstart
- SDK quickstart
- sandbox test data
- request test tokens

Repo operational checklist: [`BMONI_SANDBOX_RUNBOOK.md`](BMONI_SANDBOX_RUNBOOK.md).
