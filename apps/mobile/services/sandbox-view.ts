import type { ApiSandboxWorkspace } from "./sandbox-api";

const SIMULATED_OPENING = 300_000;

export type SimulatedPocket = { reference: string; label: string; amount: number };
export type SimulatedActivity = ApiSandboxWorkspace["activity"][number];

/**
 * A read-only projection of the isolated demo ledger.
 * NEVER convert this into provider wallet, real Pockets, or settled Activity.
 */
export function isConsistentSandboxReadModel(workspace: ApiSandboxWorkspace): boolean {
  if (workspace.simulated !== true || workspace.provider !== "moniflow-sandbox" ||
      !Number.isSafeInteger(workspace.providerBalance) ||
      !Number.isSafeInteger(workspace.internalAllocated) ||
      !Number.isSafeInteger(workspace.availableToSpend) ||
      workspace.providerBalance < 0 || workspace.internalAllocated < 0 ||
      workspace.availableToSpend < 0 ||
      workspace.availableToSpend !== workspace.providerBalance - workspace.internalAllocated ||
      !Array.isArray(workspace.activity)) return false;

  const completed = workspace.plan?.state === "COMPLETED";
  if (!completed) return workspace.activity.length === 0 && workspace.internalAllocated === 0 &&
    workspace.providerBalance === SIMULATED_OPENING && workspace.availableToSpend === SIMULATED_OPENING;

  const totals = workspace.plan?.plan?.totals;
  if (!totals) return false;

  if (workspace.activity.length !== 2) return false;
  const references = new Set<string>();
  let withdrawal = 0, allocation = 0;
  for (const entry of workspace.activity) {
    if (!entry.reference || references.has(entry.reference) ||
        entry.status !== "SIMULATED" || !Number.isSafeInteger(entry.amount) ||
        entry.amount <= 0) return false;
    references.add(entry.reference);
    if (entry.kind === "BANK_WITHDRAWAL" && entry.source === "simulated_external") {
      withdrawal += entry.amount;
    } else if (entry.kind === "POCKET_ALLOCATION" && entry.source === "simulated_internal") {
      allocation += entry.amount;
    } else {
      return false;
    }
  }
  return withdrawal > 0 && allocation > 0 &&
    workspace.providerBalance === SIMULATED_OPENING - withdrawal &&
    allocation === workspace.internalAllocated &&
    withdrawal === totals.externalMovement &&
    allocation === totals.internalAllocation;
}

export function simulatedPocketAllocations(workspace: ApiSandboxWorkspace): SimulatedPocket[] {
  if (!isConsistentSandboxReadModel(workspace)) return [];
  return workspace.activity
    .filter(item => item.kind === "POCKET_ALLOCATION" && item.source === "simulated_internal")
    .map(item => ({ reference: item.reference, label: item.label, amount: item.amount }));
}

export function simulatedActivity(workspace: ApiSandboxWorkspace): SimulatedActivity[] {
  return isConsistentSandboxReadModel(workspace) ? workspace.activity : [];
}
