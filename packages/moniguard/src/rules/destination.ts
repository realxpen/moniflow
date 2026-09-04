import { atomicIntents, type GuardRule } from "../types.js";

export const destinationRule: GuardRule = ({ intent, plan }) => {
  const requestedWithdrawals = atomicIntents(intent).filter((item) => item.intent === "BANK_WITHDRAWAL");
  const plannedWithdrawals = plan.actions.filter((action) => action.kind === "BANK_WITHDRAWAL");

  const passed =
    requestedWithdrawals.length === plannedWithdrawals.length &&
    requestedWithdrawals.every((item, index) => {
      const action = plannedWithdrawals[index];
      return Boolean(
        action &&
        item.destination.kind === "SAVED_BANK" &&
        item.destination.label.trim().length > 0 &&
        action.label === item.destination.label
      );
    });

  return {
    rule: "DESTINATION",
    passed,
    severity: passed ? "info" : "critical",
    message: passed
      ? requestedWithdrawals.length > 0
        ? "Withdrawal destination matches the validated saved-bank intent."
        : "No external destination is required."
      : "Withdrawal destination changed, disappeared, or was introduced without a validated intent."
  };
};
