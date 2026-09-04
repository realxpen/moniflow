import type { GuardRule } from "../types.js";

const supported = new Set([
  "CHECK_BALANCE",
  "BANK_WITHDRAWAL",
  "CREATE_POCKET",
  "ALLOCATE_POCKET",
  "SHOW_ACTIVITY",
  "MULTI_ACTION"
]);

export const supportedIntentRule: GuardRule = ({ intent, plan }) => {
  const passed = intent.intent !== "UNSUPPORTED" && supported.has(intent.intent) && supported.has(plan.sourceIntent);
  return {
    rule: "SUPPORTED_INTENT",
    passed,
    severity: passed ? "info" : "critical",
    message: passed ? "Intent is supported by MONIFlow." : "Unsupported intent cannot enter a financial plan."
  };
};
