import type { GuardRule } from "../types.js";

export const planIntegrityRule: GuardRule = ({ plan }) => {
  const external = plan.actions
    .filter((action) => action.movement === "EXTERNAL")
    .reduce((sum, action) => sum + action.amount, 0);
  const internal = plan.actions
    .filter((action) => action.movement === "INTERNAL")
    .reduce((sum, action) => sum + action.amount, 0);
  const total = external + internal;
  const availableAfter = plan.currentAvailable - total;
  const sequentialIndexes = plan.actions.every((action, index) => action.index === index + 1);

  const passed =
    sequentialIndexes &&
    plan.totals.externalMovement === external &&
    plan.totals.internalAllocation === internal &&
    plan.totals.totalCommitted === total &&
    plan.totals.availableAfter === availableAfter;

  return {
    rule: "PLAN_INTEGRITY",
    passed,
    severity: passed ? "info" : "critical",
    message: passed ? "Plan totals and available-after arithmetic are internally consistent." : "Plan totals, ordering, or available-after arithmetic were altered."
  };
};
