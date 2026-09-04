import { atomicIntents, type GuardRule } from "../types.js";

export const humanApprovalRule: GuardRule = ({ intent, plan }) => {
  const requestedExternal = atomicIntents(intent).some((item) => item.intent === "BANK_WITHDRAWAL");
  const plannedExternal = plan.actions.some((action) => action.movement === "EXTERNAL");
  const externalActionsRequireApproval = plan.actions
    .filter((action) => action.movement === "EXTERNAL")
    .every((action) => action.requiresApproval === true);

  const passed = requestedExternal === plannedExternal && (!plannedExternal || (plan.requiresApproval && externalActionsRequireApproval));

  return {
    rule: "HUMAN_APPROVAL",
    passed,
    severity: passed && plannedExternal ? "warning" : passed ? "info" : "critical",
    message: passed
      ? plannedExternal
        ? "Human authorization is required before external money movement."
        : "No external movement requires authorization."
      : "An external movement is missing its required human-approval boundary."
  };
};
