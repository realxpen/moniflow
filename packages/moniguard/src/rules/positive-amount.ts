import type { GuardRule } from "../types.js";

export const positiveAmountRule: GuardRule = ({ plan }) => {
  const passed = plan.actions.every((action) =>
    action.movement === "NONE"
      ? action.amount === 0
      : Number.isFinite(action.amount) && action.amount > 0
  );

  return {
    rule: "POSITIVE_AMOUNT",
    passed,
    severity: passed ? "info" : "critical",
    message: passed
      ? "All monetary actions use positive amounts."
      : "Money-moving actions must be positive and non-moving actions must remain zero."
  };
};
