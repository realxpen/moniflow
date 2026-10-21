import { type OfflineIntentLabResult } from "./offline-intent-lab";
import { evaluatePlayground } from "./money-plan-playground";

/**
 * Only two fictional whole-naira amounts cross the offline learning route.
 * Never carry the user's typed sentence, identity, bank details, auth token,
 * wallet metadata, real approval state or arbitrary instruction into a URL.
 */
export type OfflinePlanHandoff = {
  source: "intent-lab";
  withdrawal: string;
  allocation: string;
};

export type OfflinePlanDraft = {
  withdrawal: string;
  allocation: string;
  source: "intent-lab";
};

function wholeNaira(value: unknown): value is string {
  return typeof value === "string" && /^(?:0|[1-9][0-9]{0,9})$/.test(value);
}

/** Only a fully recognized and mathematically valid offline example may advance. */
export function createOfflinePlanHandoff(
  parsed: OfflineIntentLabResult | null
): OfflinePlanHandoff | null {
  if (
    !parsed ||
    parsed.state !== "RECOGNIZED" ||
    parsed.parsingMode !== "OFFLINE_EDUCATIONAL_SUBSET" ||
    parsed.simulationOnly !== true ||
    parsed.realExecutionAllowed !== false ||
    parsed.bankVerified !== false ||
    !Array.isArray(parsed.actions) ||
    parsed.actions.length < 1 ||
    parsed.actions.length > 2
  ) return null;

  let withdrawal = 0;
  let allocation = 0;
  let withdrawals = 0;
  let allocations = 0;
  for (const action of parsed.actions) {
    if (action.kind === "BANK_WITHDRAWAL") {
      if (action.bank !== "GTBank" || action.verified !== false) return null;
      withdrawal = action.amount;
      withdrawals++;
    } else if (action.kind === "ALLOCATE_POCKET") {
      if (action.pocket !== "Laptop" || action.providerMovement !== false) return null;
      allocation = action.amount;
      allocations++;
    } else {
      return null;
    }
  }
  if (withdrawals > 1 || allocations > 1) return null;

  const withdrawalText = String(withdrawal);
  const allocationText = String(allocation);
  if (!wholeNaira(withdrawalText) || !wholeNaira(allocationText)) return null;
  const math = evaluatePlayground(withdrawalText, allocationText);
  if (
    math.status !== "MATH_PREVIEW" ||
    math.financialOperationsEnabled !== false ||
    math.bankDestinationVerified !== false ||
    math.withdrawal !== withdrawal ||
    math.allocation !== allocation ||
    parsed.preview?.status !== "MATH_PREVIEW" ||
    parsed.preview.withdrawal !== withdrawal ||
    parsed.preview.allocation !== allocation
  ) return null;

  return { source: "intent-lab", withdrawal: withdrawalText, allocation: allocationText };
}

/**
 * Treat all navigation parameters as untrusted. Expo Router may return strings
 * or arrays and direct deep links can be edited. Invalid payloads are ignored,
 * leaving the ordinary fictional Playground defaults unchanged.
 */
export function readOfflinePlanHandoff(raw: {
  source?: unknown;
  withdrawal?: unknown;
  allocation?: unknown;
}): OfflinePlanDraft | null {
  if (
    raw.source !== "intent-lab" ||
    !wholeNaira(raw.withdrawal) ||
    !wholeNaira(raw.allocation)
  ) return null;

  const math = evaluatePlayground(raw.withdrawal, raw.allocation);
  if (math.status !== "MATH_PREVIEW" ||
      math.financialOperationsEnabled !== false ||
      math.bankDestinationVerified !== false) return null;

  return {
    source: "intent-lab",
    withdrawal: raw.withdrawal,
    allocation: raw.allocation
  };
}
