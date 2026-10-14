# MONIFlow Target Demo Flow

## Status

This is the target hackathon demonstration, not functionality completed in Phase 1.

## Primary instruction

> Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.

## Intended journey

`Home → command → parsing → Money Plan → MONI Guard → human approval → BMONI execution → result → Activity/Pockets`

## Expected future plan

- External action: `BANK_WITHDRAWAL` of ₦40,000 to a verified GTBank destination.
- Internal action: `ALLOCATE_POCKET` of ₦20,000 to the Laptop Pocket.
- External movement requires explicit human approval.
- Any change to amount or destination invalidates earlier approval.
- Pockets remain application-level bookkeeping unless BMONI documentation confirms real provider-held partitioning for this use case.

## Evidence the demo must eventually show

1. The instruction becomes a strict supported intent.
2. The Money Plan preserves exact amounts and destinations.
3. Deterministic MONI Guard checks are visible.
4. The user sees the financial consequence before approval.
5. No external execution begins before approval.
6. Device signing occurs only where current BMONI documentation requires it.
7. The result reflects verified provider status, including honest failure states.
8. Activity distinguishes provider-backed movement from MONIFlow bookkeeping.

## Phase 1 boundary

Phase 1 provides the route journey and visual placeholders only. It does not parse the command, calculate a plan, run Guard rules, verify a bank, sign a proposal, move money, or report BMONI success.


## Current implementation — isolated Operator simulator (October 2026)

MONIFlow now has two deliberately **non-financial** public demo routes:

- `/demo/walkthrough`: educational, static walkthrough for the canonical example.
- `/demo/operator`: interactive local UI state machine. It accepts **only** the exact canonical
  command, presents the illustrative Money Plan, explains checks without claiming to run
  real MONI Guard, requires the user to acknowledge the simulation, and then calculates
  example Pockets/Activity/balances in **ephemeral screen state**.

The simulator does **not** call the API, access a wallet or BMONI, perform real identity
verification, approve a server plan, use a device signer, or persist financial memory.
Refresh resets it. The real `/operator/*` screens remain API-backed and must never
run against fabricated or unauthenticated demo identities.

Partner user creation remains locked by default. The canonical simulated result is
an example with ₦300,000 starting provider balance, ₦40,000 hypothetical withdrawal,
₦20,000 hypothetical internal Laptop allocation, ₦260,000 hypothetical provider
balance and ₦240,000 hypothetical available-to-spend.

**Not yet proven:** live BMONI partner-scoped user recovery, KYC, wallet funding,
real device signing, and end-to-end provider settlement. Green CI does not certify
a real financial operation.
