# BMONI Capability Map

Verified against the official BMONI documentation and development OpenAPI on 2026-09-03. “Verified” means the route and contract were read from those sources; it does not mean MONIFlow has exercised a financial operation.

| Capability | Official contract evidence | Implementation status | Boundary |
|---|---|---|---|
| Partner authentication | `x-api-key` on every REST request | Implemented | API only |
| Development environment | `https://embedded-dev.bmoni.com` | Enforced | API only |
| Connectivity | `GET /v1/smart-wallets/supported-currencies` | Implemented and read-only sandbox response verified | API only |
| User creation | `POST /v1/users`; required `firstName`, `email`, `phoneNumber` | Implemented with strict schemas and persisted mapping | API only |
| User uniqueness conflict | HTTP `409` documented for existing identifiers | Fails closed; manual reconciliation required | API only |
| Idempotency | No idempotency keys documented | No mutation retries | API only |
| Wallet provisioning | Documented after user creation | Deferred | Future mobile/API split |
| KYC | Documented lifecycle capability | Deferred | Future phase |
| Supported rails | Documented lifecycle capability | Deferred | Future phase |
| Wallet funding | Documented lifecycle capability | Deferred | Future phase |
| Money movement | Documented lifecycle capability | Deferred | Human approval and future signing required |
| React Native SDK | Official SDK documentation exists | Not installed | Future device boundary |

## Create-user contract recorded for the API foundation

Required request properties:

- `firstName`
- `email`
- `phoneNumber`

Optional properties represented in the provider schema are `employeeId`, `identityId`, `lastName`, `middleName`, `bvn`, `monthlySalary`, `employerName`, `occupation`, and address fields. MONIFlow applies additional format validation for email, E.164 phone number, and BVN before sending a request.

The validated response contains a `user` with provider record `id`, durable `bmoniUserId`, identity fields, and creation/update timestamps. MONIFlow exposes only `localUserId`, `bmoniUserId`, and whether the mapping was newly created or already known.

## Connectivity evidence

The documented supported-currencies endpoint returned HTTP `200` from the development host with the shared sandbox credential. This proves authentication and basic reachability only. It does not prove user creation, wallet ownership, balances, signing, withdrawal, settlement, or production readiness.

No partner-user listing was accessed, and no sandbox user was created during verification.

## Sources

- [BMONI API introduction](https://bkey.mintlify.app/api-reference/introduction)
- [BMONI integration flow](https://bkey.mintlify.app/api-reference/integration-flow)
- [BMONI errors](https://bkey.mintlify.app/api-reference/errors)
- [BMONI lifecycle](https://bkey.mintlify.app/lifecycle)
- Development OpenAPI: `https://embedded-dev.bmoni.com/docs/openapi.json`
