# Phase 34A preflight — deterministic Intent Engine fail-closed hardening

**Date:** 2026-10-21  
**Scope:** Strengthen MONIFlow's **existing server-side deterministic intent parser** against incomplete, hidden or malformed financial instructions. No new provider capability, identity, KYC, bank verification, transaction, user approval, or deployment.

## Why

The original API parser extracted an amount and a recognized bank name by substring searching after `withdraw`. A longer instruction could be interpreted as a legitimate withdrawal while unsupported extra words were silently ignored. The pocket allocation parser likewise accepted a valid opening pattern and could treat trailing instructions as part of a pocket name. In a product designed to translate natural language into financial plans, silent partial interpretation is unsafe even when later financial permission gates remain locked.

This work changes the **interpreter** only, not `/api/operator/plan`, MONI Guard, database persistence, wallet signing or provider execution.

## Changes

- Require the **full withdrawal clause** to match an explicit whole-NGN amount, `to`, and exactly one fully recognized bank label; a known bank mentioned elsewhere in the sentence is insufficient.
- Require an anchored pocket allocation clause. Preserve standard `save`/`allocate`/`put`, `for`/`towards` and `into my … pocket` forms. Reject imperative/ambiguous extra language disguised as a pocket name.
- Match currency/amounts precisely: a `₦` or `NGN` marker or k/m suffix, positive safe integer NGN totals, well-formed commas, no sub-naira amounts, no extraction of a valid numeric prefix from malformed data.
- Reject trailing connectors, invalid clauses, and more than five joined actions as **`UNSUPPORTED`** with no partially accepted `actions`. Existing valid `MULTI_ACTION` requires every action to parse.
- Normalize a single harmless trailing sentence punctuation mark. Preserve canonical compact `₦40k` and `NGN 40,000` syntax, balance/activity reads, pocket creation, GTBank and other documented alias labels.
- Add unit and Fastify route regression tests for malformed amounts, extra verbs, beneficiary suffixes, unknown banks, amount ambiguity, excessively long inputs and legitimate cases.
- Update the outdated Intent Engine README to describe the implemented deterministic parser and its separation from authorization.

## Safety and release boundaries

This is a **code review PR**, not a production API deployment. Parser acceptance is not bank-account ownership, verified balance, execution approval, or physical device ownership proof. The actual financial release remains blocked independently by the existing BMONI partner identity, native signing and provider permission gates. No wallet, transfer, KYC, API configuration, secret, database, EAS build, deployment or real money action is authorized by this PR.

## Verification

1. CI: TypeScript, Expo web export, Vitest and disposable PostgreSQL safety tests.
2. Review expected intentional behavior change: some previously accepted, ambiguous phrases now become `UNSUPPORTED`. Do not add permissive fallbacks merely to make a demo pass.
3. Owner independently reviews and squash-merges; deployment requires a **separate explicit authorization** and a separate production-readiness check.
4. Later, before enabling production parser-based plans, independently exercise a rejected malicious phrase and a legitimate canonical phrase against a safe backend environment. Confirm subsequent provider read/financial paths still require verified identity and approval.

Related: `docs/MONIFLOW_PRODUCT_SOURCE.md`, `apps/api/src/services/intent/parser.ts`, `apps/api/src/routes/operator.ts`, `docs/PHASE33F_OFFLINE_INTENT_LAB.md`.
