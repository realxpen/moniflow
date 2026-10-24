import { evaluateMoniGuard } from "@moniflow/moniguard";
import { parseIntent } from "../intent/parser.js";
import { buildMoneyPlan } from "../plans/engine.js";
import type { SandboxWorkspace } from "./state.js";

/**
 * A stateless, authenticated teaching preview. Uses the real deterministic
 * Intent, Money Plan and MONI Guard engines against fictional sandbox money.
 * Cannot approve, mutate, sign, or execute any financial operation.
 */
export function previewSandboxIntent(state: SandboxWorkspace, command: string) {
  if (state.provider !== "moniflow-sandbox" || state.simulated !== true) {
    throw new Error("SANDBOX_PREVIEW_WRONG_PROVIDER");
  }
  const intent = parseIntent(command);
  const common = {
    localUserId: state.localUserId,
    provider: "moniflow-sandbox" as const,
    simulated: true as const,
    previewOnly: true as const,
    realFundsMoved: false as const,
    availableToSpend: state.availableToSpend
  };
  if (intent.intent === "UNSUPPORTED") {
    return { ...common, status: "UNSUPPORTED" as const, reason: intent.reason };
  }
  const plan = buildMoneyPlan(intent, state.availableToSpend);
  const review = evaluateMoniGuard({ intent, plan });
  const withdrawals = plan.actions.filter(action => action.kind === "BANK_WITHDRAWAL");

  // The financial product supports one external withdrawal per plan.
  // No provider bank is verified in this independent illustrative workspace.
  const checks = review.checks.map(check => check.rule === "DESTINATION"
    ? withdrawals.length > 1
      ? { ...check, passed: false, severity: "critical" as const,
          message: "Multiple bank withdrawals in one plan are not supported." }
      : { ...check, message: withdrawals.length
          ? "Bank label matches the instruction; no real destination has been verified."
          : "No external destination is required." }
    : check);
  const verdict = checks.some(check => !check.passed && check.severity === "critical")
    ? "BLOCK" as const : review.verdict;
  return {
    ...common,
    status: "PREVIEW" as const,
    intent: intent.intent,
    verdict,
    checks,
    actions: plan.actions.map(action => ({
      index: action.index, kind: action.kind, label: action.label,
      amount: action.amount
    })),
    totals: {
      externalMovement: plan.totals.externalMovement,
      internalAllocation: plan.totals.internalAllocation,
      totalCommitted: plan.totals.totalCommitted,
      availableAfter: plan.totals.availableAfter
    }
  };
}
