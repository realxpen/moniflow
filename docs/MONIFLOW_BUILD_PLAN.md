# MONIFlow MVP Build Plan

This document records the agreed implementation order. Product behavior remains governed by `MONIFLOW_PRODUCT_SOURCE.md`, and engineering constraints remain governed by `AGENTS.md`.

| Phase | Goal | Checkpoint |
|---:|---|---|
| 0 | Lock rules and source documents | The MVP can be summarized without invented features. |
| 1 | Repository and monorepo foundation | Mobile and API start, `/health` succeeds, TypeScript passes, and no secrets are committed. |
| 2 | UI design system | The internal component showcase is coherent and reusable before product screens are built. |
| 3 | Shell and navigation | The entire static product flow can be navigated without BMONI. |
| 4 | BMONI API foundation | A real sandbox BMONI user can be created and its identifier stored. |
| 5 | Device wallet and ownership | A wallet exists and ownership proof succeeds with the verified SDK. |
| 6 | Nigeria onboarding and KYC | Onboarding reaches the required documented provider state. |
| 7 | Wallet dashboard and balance | Home uses provider-backed wallet information rather than hardcoded values. |
| 8 | Intent Engine | Supported demo phrases map safely and deterministically. |
| 9 | Money Plan Engine | Plan calculations are correct for every supported intent. |
| 10 | MONI Guard | Intentionally malformed plans are blocked deterministically. |
| 11 | Human approval | No financial execution path exists without a valid approved plan. |
| 12 | Nigerian bank flow | A saved destination maps to documented BMONI bank-account data. |
| 13 | Real BMONI execution | Real sandbox provider status drives the result screen. |
| 14 | Money Pockets | Pocket and unallocated balances remain internally consistent. |
| 15 | Activity and financial memory | Meaningful state remains after the demo completes. |
| 16 | Optional LLM intelligence | Schema-constrained interpretation fails safely to the deterministic parser. |
| 17 | UI/UX polish | The flow is coherent, accessible, responsive, and visually consistent. |
| 18 | Demo hardening | The primary journey is repeatable and recovers honestly from failure. |
| 19 | Presentation | The product story, technical depth, safety model, and evidence are submission-ready. |

## Sequencing note

The server-side BMONI API boundary was implemented before the sequence was corrected. It is preserved as valid Phase 4 groundwork, but Phase 4 is not complete until the live sandbox user-creation checkpoint is exercised with an authorized test identity. Early groundwork does not change the current phase or authorize later BMONI work.

## Current scope rule

Finish and verify the current checkpoint before advancing. Never fill a blocked provider checkpoint with fake success, invented endpoints, or unlabeled mock financial data.
