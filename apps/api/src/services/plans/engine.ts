import type { AtomicIntent, MoniflowIntent } from "../../schemas/intent.js";
import { moneyPlanSchema, type MoneyPlan, type MoneyPlanAction } from "../../schemas/money-plan.js";

export class UnsupportedPlanIntentError extends Error {
  override readonly name = "UnsupportedPlanIntentError";
}

export function buildMoneyPlan(intent: MoniflowIntent, currentAvailable: number): MoneyPlan {
  if (!Number.isFinite(currentAvailable) || currentAvailable < 0) {
    throw new Error("currentAvailable must be a non-negative finite number.");
  }
  if (intent.intent === "UNSUPPORTED") {
    throw new UnsupportedPlanIntentError("Unsupported intent cannot become a money plan.");
  }

  const atomic = intent.intent === "MULTI_ACTION" ? intent.actions : [intent];
  const actions = atomic.map((action, index) => toPlanAction(action, index + 1));
  const externalMovement = actions
    .filter((action) => action.movement === "EXTERNAL")
    .reduce((total, action) => total + action.amount, 0);
  const internalAllocation = actions
    .filter((action) => action.movement === "INTERNAL")
    .reduce((total, action) => total + action.amount, 0);
  const totalCommitted = externalMovement + internalAllocation;

  return moneyPlanSchema.parse({
    currency: "NGN",
    currentAvailable,
    actions,
    totals: {
      externalMovement,
      internalAllocation,
      totalCommitted,
      availableAfter: currentAvailable - totalCommitted
    },
    requiresApproval: intent.requiresApproval,
    sourceIntent: intent.intent
  });
}

function toPlanAction(intent: AtomicIntent, index: number): MoneyPlanAction {
  switch (intent.intent) {
    case "BANK_WITHDRAWAL":
      return {
        index,
        kind: intent.intent,
        label: intent.destination.label,
        description: "Withdrawal",
        amount: intent.amount,
        movement: "EXTERNAL",
        requiresApproval: true
      };
    case "ALLOCATE_POCKET":
      return {
        index,
        kind: intent.intent,
        label: intent.pocket.name,
        description: "Allocation",
        amount: intent.amount,
        movement: "INTERNAL",
        requiresApproval: false
      };
    case "CREATE_POCKET":
      return {
        index,
        kind: intent.intent,
        label: intent.pocket.name,
        description: "Create pocket",
        amount: 0,
        movement: "NONE",
        requiresApproval: false
      };
    case "CHECK_BALANCE":
      return {
        index,
        kind: intent.intent,
        label: "Available balance",
        description: "Balance check",
        amount: 0,
        movement: "NONE",
        requiresApproval: false
      };
    case "SHOW_ACTIVITY":
      return {
        index,
        kind: intent.intent,
        label: "Recent activity",
        description: "Activity view",
        amount: 0,
        movement: "NONE",
        requiresApproval: false
      };
  }
}
