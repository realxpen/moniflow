import type { GuardRule } from "../types.js";

export const balanceRule: GuardRule = ({ plan }) => {
  const passed =
    Number.isFinite(plan.currentAvailable) &&
    plan.currentAvailable >= 0 &&
    Number.isFinite(plan.totals.totalCommitted) &&
    plan.totals.totalCommitted >= 0 &&
    plan.totals.totalCommitted <= plan.currentAvailable &&
    plan.totals.availableAfter >= 0;

  return {
    rule: "BALANCE",
    passed,
    severity: passed ? "info" : "critical",
    message: passed ? "Balance is sufficient for the complete plan." : "The plan exceeds the available balance or contains an invalid balance."
  };
};
