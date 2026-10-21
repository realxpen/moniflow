# MONIFlow deterministic Intent Engine — interpretation boundary

The API-side deterministic parser is implemented in `parser.ts` and used by `POST /api/operator/intent`. It classifies only supported instructions into strictly validated atomic or multi-action intents. It does **not** authorize, approve, verify a bank, sign or execute money movement.

The original Phase 1 reserved this directory without a parser; this documentation now describes the implemented boundary.

## Supported grammar

- Checking a balance, listing activity, or creating a named Money Space.
- Single withdrawals with explicit whole-NGN amount (such as `Withdraw ₦40,000 to GTBank`, `Withdraw 40k to GTBank`), plus a recognized saved-bank **label**.
- Single pocket allocations such as `Save ₦20k for laptop`, `Put NGN 20k into my laptop pocket`.
- Up to five supported atomic actions joined by `and`, `and then`, or `then`. Every clause must independently parse; otherwise the **entire** request is `UNSUPPORTED` with no accepted partial actions.
- Number formatting must be unambiguous: positive, safe, whole NGN values; correct thousands separators; explicit currency marker or k/m suffix. Fractions resulting in sub-naira amounts, malformed commas, missing amount or unsupported instructions are refused.

The parser no longer treats a bank or number merely found inside a longer statement as an acceptable withdrawal, and it requires the complete allocation instruction to match. Extra commands, multiple bank names, trailing instructions and names containing obvious second-action imperatives are not trusted.

## Trust boundaries

The parser's `BANK_WITHDRAWAL` output contains only a **bank label**, **not** evidence that a saved destination exists or that the user owns the account. Existing Money Plan, provider balance, MONI Guard, verified beneficiary, owner-signed approval and execution checks are separate requirements and remain unchanged and gated. No API route, financial flag, BMONI SDK or database schema was unlocked.

This parser hardening is **source code only** until a separately reviewed backend deployment. Unit and Fastify integration tests must pass, including attempted instruction smuggling and preservation of canonical examples.
