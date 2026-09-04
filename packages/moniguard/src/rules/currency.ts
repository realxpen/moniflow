import { atomicIntents, type GuardRule } from "../types.js";

export const currencyRule: GuardRule = ({ intent, plan }) => {
  const intentCurrenciesValid = atomicIntents(intent).every((item) =>
    "currency" in item ? item.currency === "NGN" : true
  );
  const passed = plan.currency === "NGN" && intentCurrenciesValid;

  return {
    rule: "CURRENCY",
    passed,
    severity: passed ? "info" : "critical",
    message: passed ? "Plan currency is NGN throughout." : "Currency changed or is unsupported."
  };
};
