import { walkthroughCommand, walkthroughNumbers, walkthroughScenario } from "./walkthrough";

/**
 * UI-only demo state machine. Does not import apiFetch, BMONI, AsyncStorage,
 * wallet repositories, device signers, or real MONI Guard.
 */
export type DemoStage = "intent" | "plan" | "guard" | "approval" | "execution" | "result" | "cancelled";
export type DemoOperatorState = {
  stage: DemoStage;
  confirmed: boolean;
  simulationCount: number;
};

export type DemoOperatorAction =
  | { type: "PARSE"; command: string }
  | { type: "REVIEW_PLAN" }
  | { type: "REVIEW_GUARD" }
  | { type: "APPROVE_SIMULATION"; acknowledged: boolean }
  | { type: "SIMULATE_EXECUTION" }
  | { type: "CANCEL" }
  | { type: "RESET" };

export const initialDemoOperatorState = (): DemoOperatorState => ({
  stage: "intent", confirmed: false, simulationCount: 0
});

function normalized(value: string) {
  return value.trim().replace(/\s+/g, " ").replace(/[.!]+$/, "").toLowerCase();
}

/** Deliberately supports only the canonical example, no claims of open-ended NLP. */
export function isSupportedDemoCommand(input: string) {
  return normalized(input) === normalized(walkthroughCommand);
}

export function demoGuardChecks() {
  const numbers = walkthroughNumbers();
  return [
    { label: "Example instruction recognized", passed: true, detail: "Only the pre-set canonical example is supported." },
    { label: "Illustrative amounts are positive", passed: walkthroughScenario.withdrawal > 0 && walkthroughScenario.laptopAllocation > 0,
      detail: "₦40,000 external + ₦20,000 internal allocation." },
    { label: "Illustrative available balance", passed: numbers.availableAfter >= 0,
      detail: "Calculated from the example ₦300,000 opening balance." },
    { label: "GTBank destination", passed: false,
      detail: "Real bank verification was not performed. This is a hypothetical destination only." }
  ] as const;
}

export function demoFinancialSnapshot(state: DemoOperatorState) {
  if (state.stage !== "result" || state.simulationCount !== 1 || !state.confirmed) return null;
  const numbers = walkthroughNumbers();
  return {
    ...numbers,
    providerBalanceBefore: walkthroughScenario.openingBalance,
    withdrawAmount: walkthroughScenario.withdrawal,
    pocketAmount: walkthroughScenario.laptopAllocation,
    simulated: true as const,
    activity: [
      { type: "SIMULATED_EXTERNAL_WITHDRAWAL" as const, label: "GTBank withdrawal · illustrative", amount: walkthroughScenario.withdrawal },
      { type: "SIMULATED_INTERNAL_ALLOCATION" as const, label: "Laptop Pocket · illustrative", amount: walkthroughScenario.laptopAllocation }
    ]
  };
}

/** No effectful transition; the action can only change ephemeral screen state. */
export function demoOperatorTransition(state: DemoOperatorState, action: DemoOperatorAction): DemoOperatorState {
  if (action.type === "RESET") return initialDemoOperatorState();
  if (action.type === "CANCEL") {
    return state.stage === "result" || state.stage === "cancelled" ? state : { ...state, stage: "cancelled", confirmed: false };
  }
  switch (state.stage) {
    case "intent":
      return action.type === "PARSE" && isSupportedDemoCommand(action.command)
        ? { ...state, stage: "plan" } : state;
    case "plan":
      return action.type === "REVIEW_PLAN" ? { ...state, stage: "guard" } : state;
    case "guard":
      return action.type === "REVIEW_GUARD" ? { ...state, stage: "approval" } : state;
    case "approval":
      return action.type === "APPROVE_SIMULATION" && action.acknowledged === true
        ? { ...state, stage: "execution", confirmed: true } : state;
    case "execution":
      return action.type === "SIMULATE_EXECUTION" && state.confirmed && state.simulationCount === 0
        ? { ...state, stage: "result", simulationCount: 1 } : state;
    default:
      return state;
  }
}
