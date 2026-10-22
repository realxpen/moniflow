/**
 * Offline-only practice bookkeeping. No authenticated account, provider,
 * wallet, persisted state or real financial memory may depend on this module.
 * A fresh screen always starts with exactly the fixed hypothetical balance.
 */
export const practiceOpeningBalance = 300_000;
export const practicePockets = ["Laptop", "Emergency", "Rent"] as const;
export type PracticePocket = typeof practicePockets[number];

export type PracticeEntry = {
  id: number;
  kind: "SIMULATED_ALLOCATION" | "SIMULATED_RELEASE" | "SIMULATED_WITHDRAWAL";
  label: string;
  amount: number;
};
export type PracticeLedger = {
  providerBalance: number;
  allocated: Record<PracticePocket, number>;
  entries: ReadonlyArray<PracticeEntry>;
  nextId: number;
};
export type PracticeAction =
  | { type: "ALLOCATE"; pocket: PracticePocket; amountText: string }
  | { type: "RELEASE"; pocket: PracticePocket; amountText: string }
  | { type: "WITHDRAW"; amountText: string }
  | { type: "RESET" };

export type PracticeOutcome = {
  ledger: PracticeLedger;
  status: "SIMULATED" | "BLOCKED" | "RESET";
  explanation: string;
  simulationOnly: true;
  financialOperationsEnabled: false;
  bankVerified: false;
  persistsAccountData: false;
};

export function initialPracticeLedger(): PracticeLedger {
  return {
    providerBalance: practiceOpeningBalance,
    allocated: { Laptop: 0, Emergency: 0, Rent: 0 },
    entries: [],
    nextId: 1
  };
}

export function practiceSummary(ledger: PracticeLedger) {
  const allocated = practicePockets.reduce((sum, name) => sum + ledger.allocated[name], 0);
  return {
    providerBalance: ledger.providerBalance,
    allocated,
    available: ledger.providerBalance - allocated,
    provenance: "LOCAL_SIMULATION" as const,
    realBalanceVerified: false as const,
    financialOperationsEnabled: false as const
  };
}

function safeLedger(ledger: PracticeLedger): boolean {
  const amounts = practicePockets.map(name => ledger.allocated[name]);
  return Number.isSafeInteger(ledger.providerBalance) &&
    ledger.providerBalance >= 0 && ledger.providerBalance <= practiceOpeningBalance &&
    amounts.every(n => Number.isSafeInteger(n) && n >= 0 && n <= practiceOpeningBalance) &&
    practiceSummary(ledger).available >= 0 &&
    Array.isArray(ledger.entries) && ledger.entries.length <= 30 &&
    Number.isSafeInteger(ledger.nextId) && ledger.nextId >= 1 && ledger.nextId <= 31;
}

function blocked(ledger: PracticeLedger, message: string): PracticeOutcome {
  return { ledger, status: "BLOCKED", explanation: message, simulationOnly: true,
    financialOperationsEnabled: false, bankVerified: false, persistsAccountData: false };
}

function parsedAmount(text: string): number | null {
  if (!/^[1-9][0-9]{0,9}$/.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) && value <= 1_000_000_000 ? value : null;
}

/** Every operation is local, explicit and atomic; invalid attempts never mutate state. */
export function applyPracticeAction(ledger: PracticeLedger, action: PracticeAction): PracticeOutcome {
  if (action.type === "RESET") return {
    ledger: initialPracticeLedger(), status: "RESET",
    explanation: "The temporary practice balance, Pockets and history were cleared.",
    simulationOnly: true, financialOperationsEnabled: false,
    bankVerified: false, persistsAccountData: false
  };
  if (!safeLedger(ledger)) return blocked(ledger, "Practice ledger is inconsistent. Reset the example.");
  if (ledger.entries.length >= 30) return blocked(ledger, "Practice history is full. Reset the example.");

  const amount = parsedAmount(action.amountText);
  if (amount === null) return blocked(ledger, "Enter a positive whole-naira amount without commas or signs.");
  const available = practiceSummary(ledger).available;
  if (action.type !== "WITHDRAW" && !practicePockets.includes(action.pocket)) {
    return blocked(ledger, "Unknown practice Pocket.");
  }
  if (action.type === "RELEASE" && amount > ledger.allocated[action.pocket]) {
    return blocked(ledger, "You cannot release more than the example Pocket holds.");
  }
  if (action.type !== "RELEASE" && amount > available) {
    return blocked(ledger, "Example spending plus Pocket allocations cannot exceed available money.");
  }

  const nextAllocated = { ...ledger.allocated };
  let nextProvider = ledger.providerBalance;
  let entry: Omit<PracticeEntry, "id">;
  if (action.type === "WITHDRAW") {
    nextProvider -= amount;
    entry = { kind: "SIMULATED_WITHDRAWAL", label: "GTBank · hypothetical withdrawal", amount };
  } else if (action.type === "ALLOCATE") {
    nextAllocated[action.pocket] += amount;
    entry = { kind: "SIMULATED_ALLOCATION", label: action.pocket + " · internal allocation", amount };
  } else {
    nextAllocated[action.pocket] -= amount;
    entry = { kind: "SIMULATED_RELEASE", label: action.pocket + " · allocation released", amount };
  }
  const nextLedger: PracticeLedger = {
    providerBalance: nextProvider, allocated: nextAllocated,
    entries: [{ ...entry, id: ledger.nextId }, ...ledger.entries],
    nextId: ledger.nextId + 1
  };
  if (!safeLedger(nextLedger)) return blocked(ledger, "Practice ledger is inconsistent. Reset the example.");
  return {
    ledger: nextLedger, status: "SIMULATED",
    explanation: "Example updated locally. No provider request, financial approval or real money movement occurred.",
    simulationOnly: true, financialOperationsEnabled: false,
    bankVerified: false, persistsAccountData: false
  };
}
