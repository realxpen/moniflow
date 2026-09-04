# MONIFlow — Product Source of Truth

**Version:** Hackathon MVP v0.1  
**Project:** BMONI Embedded Hackathon  
**Product Type:** Intelligent Financial Operating System  
**Market:** Nigeria-first  
**Status:** MVP Development  
**Infrastructure:** BMONI Embedded  
**Development Environment:** BMONI Sandbox

## 1. Executive Summary

MONIFlow is an intelligent, programmable financial operating system that allows people, freelancers, creators, and small businesses to manage money by simply describing what they want to accomplish.

Instead of navigating financial menus, users express an objective such as:

> “Withdraw ₦40,000 to my GTBank account, save ₦20,000 for my laptop, and leave the rest available.”

MONIFlow interprets the request, converts it into a structured Money Plan, validates the plan against wallet state and financial rules, clearly explains what will happen, requires explicit human approval, and then uses BMONI Embedded infrastructure to perform supported financial actions.

MONIFlow is not simply a wallet, banking dashboard, chatbot, budgeting app, or AI wrapper around financial APIs. It is an **intent-driven financial operating layer**.

## 2. Core Product Statement

> **MONIFlow turns human financial intentions into safe, programmable financial workflows.**

The user provides the intent.  
MONIFlow creates the plan.  
MONI Guard validates the plan.  
The human authorizes consequential actions.  
BMONI provides the underlying embedded financial infrastructure.

## 3. Core Philosophy

### Intent Before Interface
Users should describe what they want their money to accomplish instead of learning financial menu structures.

### Plan Before Execution
Natural-language instructions never directly become transactions. Every supported request first becomes a structured Money Plan.

### Safety Before Automation
Every financial plan passes through MONI Guard.

### Human Control
MONIFlow may understand, calculate, organize, recommend, prepare, and validate. Consequential external money movement requires explicit user authorization.

### Infrastructure, Not Illusion
If MONIFlow claims a BMONI financial operation happened, it must have evidence from BMONI. Demo data must never be represented as confirmed provider activity.

## 4. Problem

Financial applications remain largely menu-driven. Users must know which account contains funds, which transaction type to choose, which destination to select, how multiple operations affect the remaining balance, and which steps should happen first.

MONIFlow converts a financial objective into one understandable workflow.

## 5. Target Users

### Primary MVP Persona — Nigerian Freelancer / Creator
A user who receives irregular income, moves money between wallets and bank accounts, saves toward goals, and needs simple financial organization.

### Secondary Persona — Small Business Owner
A user who may eventually coordinate business income, operating expenses, taxes, suppliers, payroll, savings, and collections.

Future personas include creators, gig workers, families, online sellers, students, marketplace merchants, micro-businesses, and teams.

## 6. Product Differentiation

MONIFlow should not be positioned as “ChatGPT for banking.”

The product introduces an execution architecture:

User Intent → Structured Financial Intent → Money Plan → MONI Guard → Human Authorization → Financial Execution → Verification → Financial Memory

## 7. Product Architecture

USER  
↓  
MONIFlow Interface  
↓  
Intent Engine  
↓  
Money Plan Engine  
↓  
MONI Guard  
↓  
Human Approval  
↓  
Execution Engine  
↓  
BMONI Embedded  
↓  
Financial Rails  
↓  
Verification  
↓  
MONIFlow Financial Memory

## 8. Core Engines

### Intent Engine
Understands what the user wants and produces structured intent. It never executes transactions.

### Money Plan Engine
Converts intent into a financial plan containing actions, amounts, destinations, balances, internal allocations, external movement, fees when available, and authorization requirements.

### MONI Guard
Deterministically validates supported intent, currency, amount positivity, sufficient balance, destination validity, amount preservation, plan totals, and approval requirements. Returns `ALLOW`, `REVIEW`, or `BLOCK`.

### Human Authorization Layer
Shows the exact financial consequence before external execution.

### Execution Engine
Maps approved MONIFlow actions to supported BMONI operations. The Intent Engine never knows BMONI endpoint names.

### Financial Memory
Maintains Money Plans, saved destinations, pockets, goals, activity, and explicit user-defined financial rules.

## 9. BMONI Role

BMONI Embedded is the infrastructure underneath MONIFlow. Depending on currently supported BMONI capabilities, the product may integrate user creation, secure embedded wallets, KYC, Nigerian rails, CNGN wallet functionality, virtual accounts, bank verification, deposits, withdrawals/offramp, and proposal workflows.

**Source of truth:** https://bkey.mintlify.app/

No BMONI endpoint, SDK method, enum, payload, or response structure may be invented.

## 10. Hackathon MVP Hypothesis

> Can a user express a multi-step financial objective naturally and have MONIFlow safely translate that intent into a BMONI-powered financial workflow while maintaining human control?

## 11. MVP Journey

Open MONIFlow → Create Profile → Create BMONI User → Provision Secure Wallet → Complete Required Sandbox Identity / Nigeria Onboarding → Activate Nigerian Capability → Display Wallet and Balance → User Gives Instruction → Interpret Intent → Generate Money Plan → MONI Guard → User Review → Explicit Approval → BMONI Workflow → Device Signing When Required → Verify Result → Update Activity.

## 12. Primary Demo Command

> **“Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.”**

Expected actions:

- `BANK_WITHDRAWAL` — ₦40,000 to verified GTBank account
- `ALLOCATE_POCKET` — ₦20,000 to Laptop Pocket

## 13. MVP Supported Intents

- `CHECK_BALANCE`
- `BANK_WITHDRAWAL`
- `CREATE_POCKET`
- `ALLOCATE_POCKET`
- `SHOW_ACTIVITY`
- `MULTI_ACTION`
- `UNSUPPORTED`

Anything outside this list must fail safely.

## 14. MVP Priorities

### P0 — Mandatory
- BMONI sandbox connection
- user creation
- embedded wallet
- wallet ownership
- Nigeria onboarding
- wallet state/balance where supported
- bank verification
- withdrawal/proposal workflow
- transaction status
- natural-language command input
- structured intent
- Money Plan generation
- MONI Guard
- human approval
- execution state
- success/failure UI

### P1 — Important
- Money Pockets
- Activity
- virtual account display
- bank management
- transaction details
- polished loading/retry states
- haptics and subtle onboarding animation

### P2 — Optional
- LLM intent interpretation
- advanced animations
- analytics/charts
- financial insights
- extra example commands

The deterministic parser must remain available for demo reliability.

## 15. Money Pockets

Pockets are application-level bookkeeping allocations unless BMONI explicitly supports real asset partitioning for this exact use case. MONIFlow must not falsely claim separate provider-held balances.

Examples: Laptop, Tax, Emergency, Business.

## 16. Core Screens

1. Splash — `MONIFlow / Money, operated intelligently.`
2. Welcome — `Your financial operator.`
3. Identity — required sandbox/BMONI fields only.
4. Wallet Provisioning — device wallet, ownership, CNGN wallet, Nigerian capability.
5. Home — balance, wallet summary, quick actions, operator input, suggestions, pockets, activity.
6. Processing — process states only, never hidden chain-of-thought.
7. Money Plan — request, actions, amounts, destinations, balance before/after, guard result.
8. MONI Guard — visible deterministic checks.
9. Authorization — consequential action summary and explicit approval.
10. Execution — guard passed, approved, proposal, signing, processing, result.
11. Result — verified provider-backed status.
12. Activity — financial and application-level activity, clearly differentiated.
13. Pockets — create, allocate, rename, set target.

## 17. Money Plan State Machine

`DRAFT → PARSING → VALIDATING → BLOCKED | AWAITING_USER_APPROVAL → APPROVED → EXECUTING → AWAITING_DEVICE_SIGNATURE → PROCESSING → COMPLETED | FAILED`

Alternative terminal state: `CANCELLED`.

A plan can never move directly from `DRAFT` to `EXECUTING`.

## 18. Security Model

### AI can
interpret, structure, recommend, calculate, prepare.

### AI cannot
hold private keys, authorize transactions, bypass MONI Guard, or directly invoke arbitrary financial operations.

### Backend can
hold BMONI application credentials, communicate with BMONI REST services, manage plans, enforce policy, coordinate execution.

### Backend cannot
pretend to be the user's device signer or store user wallet private keys.

### Device owns
wallet ownership, secure signing, and user authorization where applicable.

## 19. Non-Negotiable Safety Rules

1. No AI-generated text directly executes financial operations.
2. No BMONI API key in the mobile bundle.
3. No user private key transmitted to MONIFlow servers.
4. No unsupported intent silently converted to another operation.
5. No transaction amount may change after approval.
6. Changing amount or destination invalidates previous approval.
7. Every external financial movement requires explicit approval.
8. Never claim success until BMONI reports an appropriate successful state.
9. Never mix sandbox and production environments.
10. Never expose secrets through logs.

## 20. Technical Architecture

Recommended monorepo:

```text
moniflow/
  apps/
    mobile/
    api/
  packages/
    shared/
    intent-engine/
    moniguard/
  docs/
  AGENTS.md
  PROJECT_STATE.md
  README.md
  .env.example
```

### Mobile
React Native, TypeScript, Expo development build where compatible, Expo Router, Zustand, TanStack Query, React Hook Form, Zod, BMONI React Native SDK.

Responsibilities: UI, local session, BMONI device SDK interaction, secure wallet actions, signing, authorization UX.

### Backend
Node.js + TypeScript, Fastify, Zod, SQLite for hackathon persistence.

Responsibilities: BMONI REST client, user mapping, Money Plans, Intent Engine orchestration, MONI Guard, bank flows, execution orchestration, provider-status handling.

## 21. Core Data Model

### User
`id, firstName, lastName, email, phone, bmoniUserId, createdAt`

### Wallet
`id, userId, bmoniSmartWalletId, walletAddress, currency, status, createdAt`

### BankAccount
`id, userId, providerAccountId, bankCode, bankName, maskedAccountNumber, accountHolderName, verified`

### Pocket
`id, userId, name, targetAmount, allocatedAmount, currency, createdAt`

### MoneyPlan
`id, userId, originalInstruction, status, currency, balanceBefore, externalMovement, internalAllocation, expectedAvailableAfter, guardVerdict, createdAt, approvedAt, completedAt`

### PlanAction
`id, moneyPlanId, type, amount, destinationType, destinationId, position, status`

### GuardCheck
`id, moneyPlanId, rule, passed, severity, message`

### Activity
`id, userId, type, amount, currency, source, providerReference, status, createdAt`

## 22. Intent Schema Example

```json
{
  "intent": "MULTI_ACTION",
  "currency": "NGN",
  "actions": [
    {
      "type": "BANK_WITHDRAWAL",
      "amount": 40000,
      "destination": { "kind": "SAVED_BANK", "label": "GTBank" }
    },
    {
      "type": "ALLOCATE_POCKET",
      "amount": 20000,
      "destination": { "kind": "POCKET", "label": "Laptop" }
    }
  ],
  "requiresApproval": true
}
```

Implementation must use strict Zod schemas.

## 23. Intent Engine Architecture

Natural Language → Normalization → Deterministic Parser → Optional LLM Parser → Schema Validation → Intent.

If LLM parsing fails, fall back to deterministic parsing. If neither can safely resolve the request, return `UNSUPPORTED`. Never guess financial intent.

## 24. MONI Guard Architecture

IntentSchemaRule → SupportedCurrencyRule → PositiveAmountRule → BalanceRule → DestinationRule → AmountIntegrityRule → PlanIntegrityRule → HumanApprovalRule → Decision.

AI does not decide whether MONI Guard passes.

## 25. Withdrawal Execution Architecture

Approved `BANK_WITHDRAWAL` → Resolve Verified Bank → Create Required BMONI Withdrawal/Offramp Operation → Receive Proposal → Perform Required Proposal Approval → Retrieve Signing Payload → Send Signing Payload to Device → BMONI SDK Signs → Return Signature → Submit Signature → Fetch/Poll Status → Completed / Failed.

Exact implementation must follow current BMONI documentation.

## 26. Long-Term Vision

### LifeWallet
Financial domains such as Food, Transport, Business, Tax, Savings, Family, and Entertainment, each with budgets, goals, limits, alerts, and policies.

### GhostPay
Purpose-specific temporary payment identities with rules such as maximum amount, purpose, expiry, payer restrictions, payment count, and automatic closure—only where underlying infrastructure supports the behavior.

### TrustDrop
Protected commerce workflows for freelancing, social commerce, used-item sales, rentals, and service transactions. Do not represent it as regulated escrow unless legal and infrastructure requirements are actually satisfied.

### Future Agents
Income Agent, Savings Agent, Bills Agent, Business Agent, Tax Agent, Family Agent, Travel Agent. These remain policy-constrained modules, not unrestricted autonomous financial actors.

## 27. Product Roadmap

The detailed sequence and phase checkpoints are recorded in [`MONIFLOW_BUILD_PLAN.md`](MONIFLOW_BUILD_PLAN.md). The required order is:

0. Lock build rules and product sources.
1. Establish the repository and monorepo foundation.
2. Build and visually validate the UI design system.
3. Build the static shell and navigation.
4. Complete the BMONI API foundation and prove a real sandbox user can be created.
5. Add device wallet provisioning and ownership proof with the verified SDK.
6. Add Nigeria onboarding and KYC.
7. Populate wallet dashboard and balance from provider-backed data.
8. Implement the deterministic Intent Engine.
9. Implement the Money Plan Engine.
10. Implement deterministic MONI Guard rules.
11. Implement human approval and approval invalidation.
12. Implement the documented Nigerian bank flow.
13. Execute the approved BMONI sandbox flow and verify provider status.
14. Add application-level Money Pockets.
15. Add Activity and financial memory.
16. Optionally add schema-constrained LLM interpretation with deterministic fallback.
17. Polish UI/UX without weakening consequence clarity.
18. Harden the repeatable demo.
19. Prepare the presentation and submission.

Post-hackathon work may expand intelligence, LifeWallet, GhostPay, TrustDrop research, and Business MONIFlow. It must not enter the hackathon MVP without an explicit scope change.

## 28. Hackathon Success Criteria

Judges should clearly see:

1. real BMONI integration;
2. a clear multi-step financial-management problem;
3. natural-language intent becoming a structured workflow;
4. MONI Guard safety;
5. explicit human control;
6. technical depth across wallet, orchestration, signing, and policy;
7. credible expansion potential.

## 29. Demo Narrative

> “Financial apps force users to understand their interface before they can manage their money.”

Enter the primary command.

> “MONIFlow reverses that relationship. I tell it the outcome I want.”

Show the Money Plan.

> “The intelligence layer translates that intention into a structured financial plan.”

Show MONI Guard.

> “But financial AI shouldn't have unrestricted authority over people's money. Every plan passes through MONI Guard.”

Approve.

> “Consequential actions still belong to the human.”

Execute.

> “BMONI Embedded provides the underlying wallet and financial infrastructure.”

Close with:

> **“The user provides the intent. MONIFlow creates the plan. MONI Guard protects the decision. BMONI powers the movement. The human remains in control.”**

## 30. Explicitly Out of Scope for Hackathon

Do not build full accounting, investments, loans, cards, real-money production payments, trading, a social network, a merchant marketplace, full escrow, GhostPay, TrustDrop, complete LifeWallet, autonomous trading, or unrestricted financial execution.

## 31. Development Rules

1. Working integration beats visual completeness.
2. BMONI documentation is the source of truth.
3. Never fake provider success.
4. Never expose financial secrets.
5. Never allow AI to directly execute financial operations.
6. Every consequential external transaction requires explicit authorization.
7. Keep hackathon scope narrow.
8. Do not redesign working architecture without a blocking reason.
9. After each major phase run typecheck, tests, apps, and update `PROJECT_STATE.md`.
10. Diagnose failed BMONI integration instead of silently replacing it with mocks.

## 32. Definition of Done — Hackathon MVP

MONIFlow v0.1 is complete when:

- app launches reliably;
- required sandbox onboarding works;
- BMONI user exists;
- BMONI wallet exists;
- wallet state/balance can be obtained where supported;
- Home displays the financial workspace;
- primary demo command parses correctly;
- Money Plan calculates correctly;
- MONI Guard validates it;
- user sees exactly what will happen;
- explicit approval is required;
- supported BMONI action can be initiated;
- required device signing works;
- result/status is verified;
- activity reflects the outcome;
- failures are handled safely;
- no secrets leak;
- demo can be repeated.

## 33. One-Sentence Pitch

> **MONIFlow is an intelligent financial operating system that turns natural-language money intentions into safe, programmable financial workflows powered by BMONI Embedded.**

## 34. Long-Term Vision

> **A future where people don't operate financial software — they express financial intentions, define their rules, and MONIFlow safely orchestrates the infrastructure required to accomplish them.**

## 35. Final Principle

MONIFlow should become increasingly capable without making the user increasingly powerless. Greater automation must be accompanied by greater transparency, stronger policy enforcement, clearer authorization, better auditability, and meaningful human control.
