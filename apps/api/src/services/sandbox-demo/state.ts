import { randomUUID } from "node:crypto";
import { evaluateMoniGuard, type GuardResult } from "@moniflow/moniguard";
import type { MoneyPlan } from "../../schemas/money-plan.js";
import { parseIntent } from "../intent/parser.js";
import { buildMoneyPlan } from "../plans/engine.js";
import { fingerprintMoneyPlan } from "../plans/approval.js";

export const SANDBOX_COMMAND = "Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.";
export const SANDBOX_OPENING = 300_000;
export type SandboxStep = "AWAITING_APPROVAL" | "APPROVED" | "COMPLETED";
export type SandboxActivity = {
  reference: string; kind: "BANK_WITHDRAWAL" | "POCKET_ALLOCATION";
  source: "simulated_external" | "simulated_internal"; amount: number;
  status: "SIMULATED"; label: string;
};
export type SandboxPlan = {
  id: string; plan: MoneyPlan; planHash: string; approvedHash: string | null;
  verdict: GuardResult; state: SandboxStep; createdAt: string; approvedAt: string | null; completedAt: string | null;
};
export type SandboxWorkspace = {
  simulated: true; provider: "moniflow-sandbox"; localUserId: string;
  providerBalance: number; internalAllocated: number; availableToSpend: number;
  resetCount: number; plan: SandboxPlan | null; activity: SandboxActivity[];
  updatedAt: string;
};

export class SandboxActionError extends Error {
  constructor(readonly code: string, readonly statusCode: number, message: string) {
    super(message);
  }
}

export function initialSandboxWorkspace(localUserId: string, resetCount = 0): SandboxWorkspace {
  return {
    simulated: true, provider: "moniflow-sandbox", localUserId,
    providerBalance: SANDBOX_OPENING, internalAllocated: 0,
    availableToSpend: SANDBOX_OPENING, resetCount, plan: null, activity: [],
    updatedAt: new Date().toISOString()
  };
}

export function normalizeSandboxCommand(value: string) {
  return value.trim().replace(/\s+/g, " ").replace(/[.!]+$/, "").toLowerCase();
}
export function isSandboxCommand(value: string) {
  return normalizeSandboxCommand(value) === normalizeSandboxCommand(SANDBOX_COMMAND);
}

export type SandboxMutation =
  | { kind: "plan"; command: string }
  | { kind: "approve"; planId: string; expectedPlanHash: string; acknowledged: true }
  | { kind: "execute"; planId: string }
  | { kind: "reset"; acknowledgment: "RESET_SIMULATED_WORKSPACE" };

/**
 * Pure transition: mutations are persisted under a row lock or SQLite BEGIN IMMEDIATE.
 * Nothing here invokes BMONI, signs a transaction or uses provider wallet repositories.
 */
export function transitionSandbox(current: SandboxWorkspace, action: SandboxMutation): SandboxWorkspace {
  if (current.simulated !== true || current.provider !== "moniflow-sandbox") {
    throw new SandboxActionError("SANDBOX_CORRUPT", 503, "The isolated sandbox state is invalid.");
  }
  if (action.kind === "reset") {
    return initialSandboxWorkspace(current.localUserId, current.resetCount + 1);
  }
  if (action.kind === "plan") {
    if (!isSandboxCommand(action.command)) {
      throw new SandboxActionError("EXAMPLE_ONLY", 422, "Only the published canonical demonstration instruction is supported.");
    }
    if (current.plan) return current; // Idempotent: no duplicate plans on retry.
    const intent = parseIntent(SANDBOX_COMMAND);
    if (intent.intent !== "MULTI_ACTION") {
      throw new SandboxActionError("INTENT_NOT_SUPPORTED", 503, "The canonical example could not be parsed.");
    }
    const plan = buildMoneyPlan(intent, current.availableToSpend);
    const guard = evaluateMoniGuard({ intent, plan });
    if (guard.verdict !== "REVIEW" || guard.checks.some(c => !c.passed && c.severity === "critical")) {
      throw new SandboxActionError("GUARD_BLOCKED", 409, "MONI Guard did not clear the example for human review.");
    }
    const withdrawal = plan.actions.find(item => item.kind === "BANK_WITHDRAWAL");
    const allocation = plan.actions.find(item => item.kind === "ALLOCATE_POCKET");
    if (withdrawal?.label !== "GTBank" || withdrawal.amount !== 40_000 ||
        allocation?.label !== "Laptop" || allocation.amount !== 20_000) {
      throw new SandboxActionError("PLAN_INTEGRITY", 503, "The example plan differs from the canonical instruction.");
    }
    // The actual Guard checks intent/plan integrity. The sandbox destination is NOT bank-verified.
    const verdict: GuardResult = {
      ...guard,
      checks: guard.checks.map(check => check.rule === "DESTINATION"
        ? { ...check, message: "GTBank matches the example saved-bank label; no real bank account was verified." }
        : check)
    };
    const now = new Date().toISOString();
    return {
      ...current, plan: {
        id: randomUUID(), plan, planHash: fingerprintMoneyPlan(plan),
        approvedHash: null, verdict, state: "AWAITING_APPROVAL",
        createdAt: now, approvedAt: null, completedAt: null
      }, updatedAt: now
    };
  }
  const existing = current.plan;
  if (!existing || existing.id !== action.planId) {
    throw new SandboxActionError("PLAN_NOT_FOUND", 404, "No matching sandbox Money Plan exists.");
  }
  const actualHash = fingerprintMoneyPlan(existing.plan);
  if (actualHash !== existing.planHash) {
    throw new SandboxActionError("PLAN_CHANGED", 409, "The Money Plan has changed. Approval and execution are blocked.");
  }
  if (action.kind === "approve") {
    if (action.expectedPlanHash !== actualHash) {
      throw new SandboxActionError("PLAN_HASH_MISMATCH", 409, "Approval fingerprint did not match the reviewed plan.");
    }
    if (existing.state === "COMPLETED") return current;
    if (existing.state === "APPROVED" && existing.approvedHash === actualHash) return current;
    if (existing.state !== "AWAITING_APPROVAL" || existing.verdict.verdict !== "REVIEW") {
      throw new SandboxActionError("NOT_AWAITING_APPROVAL", 409, "The example is not awaiting human review.");
    }
    const now = new Date().toISOString();
    return { ...current, plan: { ...existing, state: "APPROVED", approvedHash: actualHash, approvedAt: now }, updatedAt: now };
  }
  if (existing.state === "COMPLETED") return current;
  if (existing.state !== "APPROVED" || existing.approvedHash !== actualHash) {
    throw new SandboxActionError("NOT_APPROVED", 409, "Simulation cannot proceed without approval of the unchanged plan.");
  }
  const { externalMovement, internalAllocation, totalCommitted } = existing.plan.totals;
  if (current.availableToSpend < totalCommitted || current.providerBalance < externalMovement) {
    throw new SandboxActionError("BALANCE_CHANGED", 409, "Simulated funds changed; execution is blocked.");
  }
  const withdrawal = existing.plan.actions.find(item => item.kind === "BANK_WITHDRAWAL")!;
  const pocket = existing.plan.actions.find(item => item.kind === "ALLOCATE_POCKET")!;
  const now = new Date().toISOString();
  const providerBalance = current.providerBalance - externalMovement;
  const internalAllocated = current.internalAllocated + internalAllocation;
  return {
    ...current, providerBalance, internalAllocated,
    availableToSpend: providerBalance - internalAllocated,
    activity: [
      { reference: existing.id + ":withdrawal", kind: "BANK_WITHDRAWAL", source: "simulated_external",
        amount: withdrawal.amount, label: withdrawal.label, status: "SIMULATED" },
      { reference: existing.id + ":allocation", kind: "POCKET_ALLOCATION", source: "simulated_internal",
        amount: pocket.amount, label: pocket.label, status: "SIMULATED" }
    ],
    plan: { ...existing, state: "COMPLETED", completedAt: now }, updatedAt: now
  };
}
