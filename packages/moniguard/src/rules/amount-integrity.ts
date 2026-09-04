import { atomicIntents, type GuardRule } from "../types.js";

export const amountIntegrityRule: GuardRule = ({ intent, plan }) => {
  const requested = atomicIntents(intent);
  if (requested.length !== plan.actions.length) {
    return {
      rule: "AMOUNT_INTEGRITY",
      passed: false,
      severity: "critical",
      message: "Plan action count does not match the validated intent."
    };
  }

  const passed = requested.every((item, index) => {
    const action = plan.actions[index];
    if (!action || action.kind !== item.intent) return false;
    if (item.intent === "BANK_WITHDRAWAL" || item.intent === "ALLOCATE_POCKET") {
      return action.amount === item.amount;
    }
    return action.amount === 0;
  });

  return {
    rule: "AMOUNT_INTEGRITY",
    passed,
    severity: passed ? "info" : "critical",
    message: passed ? "Requested amounts were preserved exactly." : "A requested amount changed between intent and plan."
  };
};
