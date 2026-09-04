import { createHash } from "node:crypto";

import type { MoneyPlanRepository, PersistedMoneyPlan } from "../../repositories/money-plan.js";
import { moneyPlanSchema, type MoneyPlan } from "../../schemas/money-plan.js";

export class ApprovalStateError extends Error {
  override readonly name = "ApprovalStateError";
  constructor(message: string, readonly code: "NOT_FOUND" | "NOT_AWAITING_APPROVAL" | "PLAN_CHANGED" | "NOT_APPROVED") {
    super(message);
  }
}

export function fingerprintMoneyPlan(input: MoneyPlan): string {
  const plan = moneyPlanSchema.parse(input);
  const sensitiveSnapshot = {
    currency: plan.currency,
    currentAvailable: plan.currentAvailable,
    actions: [...plan.actions]
      .sort((a, b) => a.index - b.index)
      .map((action) => ({
        index: action.index,
        kind: action.kind,
        label: action.label,
        description: action.description,
        amount: action.amount,
        movement: action.movement,
        requiresApproval: action.requiresApproval
      })),
    totals: {
      externalMovement: plan.totals.externalMovement,
      internalAllocation: plan.totals.internalAllocation,
      totalCommitted: plan.totals.totalCommitted,
      availableAfter: plan.totals.availableAfter
    },
    requiresApproval: plan.requiresApproval,
    sourceIntent: plan.sourceIntent
  };
  return createHash("sha256").update(JSON.stringify(sensitiveSnapshot)).digest("hex");
}

export async function loadAuthorizationPlan(
  repository: MoneyPlanRepository,
  planId: string,
  localUserId: string
): Promise<PersistedMoneyPlan> {
  const stored = await repository.findById(planId, localUserId);
  if (!stored) throw new ApprovalStateError("Money Plan not found.", "NOT_FOUND");

  const currentHash = fingerprintMoneyPlan(stored.plan);
  if (stored.status === "APPROVED" && stored.approvedPlanHash !== currentHash) {
    // Pass the last guarded hash, not the changed hash. This guarantees a changed plan
    // cannot establish a new approvable fingerprint without MONI Guard running again.
    const invalidated = await repository.invalidateApproval(planId, localUserId, stored.planHash);
    if (!invalidated) throw new ApprovalStateError("Money Plan not found.", "NOT_FOUND");
    return invalidated;
  }
  return stored;
}

export async function approveMoneyPlan(
  repository: MoneyPlanRepository,
  planId: string,
  localUserId: string,
  expectedPlanHash: string
): Promise<PersistedMoneyPlan> {
  const stored = await loadAuthorizationPlan(repository, planId, localUserId);
  if (stored.status !== "AWAITING_USER_APPROVAL") {
    throw new ApprovalStateError("This plan is not awaiting human approval.", "NOT_AWAITING_APPROVAL");
  }

  const currentHash = fingerprintMoneyPlan(stored.plan);
  if (currentHash !== stored.planHash || currentHash !== expectedPlanHash) {
    // Preserve the last guarded fingerprint so repeat approval attempts continue to fail
    // until the changed plan is re-evaluated by MONI Guard.
    await repository.invalidateApproval(planId, localUserId, stored.planHash);
    throw new ApprovalStateError("The amount or destination changed. Approval was invalidated; run MONI Guard again, then review and approve the changed plan.", "PLAN_CHANGED");
  }

  const approved = await repository.approve(planId, localUserId, currentHash);
  if (!approved || approved.status !== "APPROVED" || approved.approvedPlanHash !== currentHash) {
    throw new ApprovalStateError("This plan could not transition to APPROVED.", "NOT_AWAITING_APPROVAL");
  }
  return approved;
}

export async function requireApprovedPlanForExecution(
  repository: MoneyPlanRepository,
  planId: string,
  localUserId: string
): Promise<PersistedMoneyPlan> {
  const stored = await loadAuthorizationPlan(repository, planId, localUserId);
  const currentHash = fingerprintMoneyPlan(stored.plan);
  if (
    stored.status !== "APPROVED" ||
    !stored.approvedPlanHash ||
    stored.approvedPlanHash !== currentHash ||
    stored.planHash !== currentHash
  ) {
    throw new ApprovalStateError("Financial execution requires an approved, unchanged Money Plan.", "NOT_APPROVED");
  }
  return stored;
}
