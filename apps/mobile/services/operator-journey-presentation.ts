export type OperatorStage = "understand" | "plan" | "guard";
export const operatorJourneyStages = [
  { id: "understand", number: "01", label: "UNDERSTAND" },
  { id: "plan", number: "02", label: "PLAN" },
  { id: "guard", number: "03", label: "GUARD" }
] as const;

export function operatorStagePosition(stage: OperatorStage): number {
  return operatorJourneyStages.findIndex((item) => item.id === stage);
}

type GuardDisplay = {
  label: string;
  tone: "processing" | "warning" | "error" | "success";
  completionLabel: string;
};

/** UI-only: missing or unknown results never receive a positive financial-state badge. */
export function guardDecisionPresentation(
  verdict: string | null | undefined, loading: boolean
): GuardDisplay {
  if (loading) return { label: "CHECKING", tone: "processing", completionLabel: "RULES RUNNING" };
  if (verdict === "ALLOW") return { label: "ALLOW", tone: "success", completionLabel: "GUARD CHECKS COMPLETE" };
  if (verdict === "REVIEW") return { label: "REVIEW REQUIRED", tone: "warning", completionLabel: "HUMAN REVIEW REQUIRED" };
  if (verdict === "BLOCK") return { label: "BLOCK", tone: "error", completionLabel: "BLOCKED" };
  return { label: "UNAVAILABLE", tone: "warning", completionLabel: "NO VALID GUARD VERDICT" };
}
