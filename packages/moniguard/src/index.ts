import { z } from "zod";

import { amountIntegrityRule } from "./rules/amount-integrity.js";
import { balanceRule } from "./rules/balance.js";
import { currencyRule } from "./rules/currency.js";
import { destinationRule } from "./rules/destination.js";
import { humanApprovalRule } from "./rules/human-approval.js";
import { planIntegrityRule } from "./rules/plan-integrity.js";
import { positiveAmountRule } from "./rules/positive-amount.js";
import { supportedIntentRule } from "./rules/supported-intent.js";
import type { GuardContext, GuardResult, GuardRule, GuardRuleName, GuardVerdict } from "./types.js";

export * from "./types.js";

export const guardVerdictSchema = z.enum(["ALLOW", "REVIEW", "BLOCK"]);
export const guardCheckSchema = z.object({
  rule: z.enum([
    "SUPPORTED_INTENT",
    "POSITIVE_AMOUNT",
    "CURRENCY",
    "BALANCE",
    "DESTINATION",
    "AMOUNT_INTEGRITY",
    "PLAN_INTEGRITY",
    "HUMAN_APPROVAL"
  ]),
  passed: z.boolean(),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string().min(1)
}).strict();
export const guardResultSchema = z.object({
  verdict: guardVerdictSchema,
  checks: z.array(guardCheckSchema).length(8)
}).strict();

const rules: GuardRule[] = [
  supportedIntentRule,
  positiveAmountRule,
  currencyRule,
  balanceRule,
  destinationRule,
  amountIntegrityRule,
  planIntegrityRule,
  humanApprovalRule
];

export function evaluateMoniGuard(context: GuardContext): GuardResult {
  const checks = rules.map((rule) => rule(context));
  const blocked = checks.some((check) => !check.passed && check.severity === "critical");
  const needsHumanApproval = checks.some(
    (check) => check.rule === "HUMAN_APPROVAL" && check.passed && check.severity === "warning"
  );
  const verdict: GuardVerdict = blocked ? "BLOCK" : needsHumanApproval ? "REVIEW" : "ALLOW";
  return guardResultSchema.parse({ verdict, checks });
}

export const MONI_GUARD_RULES: readonly GuardRuleName[] = [
  "SUPPORTED_INTENT",
  "POSITIVE_AMOUNT",
  "CURRENCY",
  "BALANCE",
  "DESTINATION",
  "AMOUNT_INTEGRITY",
  "PLAN_INTEGRITY",
  "HUMAN_APPROVAL"
];
