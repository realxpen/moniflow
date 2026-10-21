import { evaluatePlayground, type PlaygroundResult } from "./money-plan-playground";

/**
 * A purposely limited educational interpreter. This does NOT import or
 * replace the production API parser and must not authorize financial work.
 */
export type OfflineIntentAction =
  | { kind: "BANK_WITHDRAWAL"; amount: number; bank: "GTBank"; verified: false }
  | { kind: "ALLOCATE_POCKET"; amount: number; pocket: "Laptop"; providerMovement: false };

export type OfflineIntentLabResult = {
  simulationOnly: true;
  realExecutionAllowed: false;
  bankVerified: false;
  parsingMode: "OFFLINE_EDUCATIONAL_SUBSET";
  state: "RECOGNIZED" | "BLOCKED" | "UNSUPPORTED" | "PROVIDER_READ_REQUIRED";
  explanation: string;
  actions: ReadonlyArray<OfflineIntentAction>;
  preview: PlaygroundResult | null;
};

export const offlineIntentExamples = [
  { id: "combined", label: "Withdrawal + savings", command: "Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop." },
  { id: "withdrawal", label: "Withdrawal only", command: "Withdraw ₦15,000 to GTBank." },
  { id: "savings", label: "Savings only", command: "Save ₦100,000 for my laptop." },
  { id: "insufficient", label: "Overspending", command: "Withdraw ₦250,000 to GTBank and save ₦100,000 for my laptop." },
  { id: "unknown", label: "Unknown bank", command: "Withdraw ₦40,000 to Moon Bank." },
  { id: "balance", label: "Check balance", command: "Check my balance." }
] as const;

const money = "(?:₦|NGN\\s*)([0-9][0-9,]*)";
const withdrawalPattern = new RegExp("^withdraw\\s+" + money + "\\s+to\\s+(?:my\\s+)?gtbank(?:\\s+account)?$", "i");
const savingsPattern = new RegExp("^(?:save|allocate)\\s+" + money + "\\s+(?:for|towards)\\s+(?:my\\s+)?laptop$", "i");
const max = 220;

function amountFromText(raw: string): number | null {
  // Only exactly placed thousands separators, or plain whole-naira digits.
  if (!/^(?:[1-9][0-9]*|[1-9][0-9]{0,2}(?:,[0-9]{3})+)$/.test(raw)) return null;
  const amount = Number(raw.replace(/,/g, ""));
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 1_000_000_000
    ? amount : null;
}

function atomic(text: string): OfflineIntentAction | null {
  const withdrawal = text.match(withdrawalPattern);
  if (withdrawal?.[1]) {
    const amount = amountFromText(withdrawal[1]);
    return amount === null ? null : { kind: "BANK_WITHDRAWAL", amount, bank: "GTBank", verified: false };
  }
  const saving = text.match(savingsPattern);
  if (saving?.[1]) {
    const amount = amountFromText(saving[1]);
    return amount === null ? null : { kind: "ALLOCATE_POCKET", amount, pocket: "Laptop", providerMovement: false };
  }
  return null;
}

function result(
  state: OfflineIntentLabResult["state"],
  explanation: string,
  actions: ReadonlyArray<OfflineIntentAction> = [],
  preview: PlaygroundResult | null = null
): OfflineIntentLabResult {
  return {
    simulationOnly: true, realExecutionAllowed: false, bankVerified: false,
    parsingMode: "OFFLINE_EDUCATIONAL_SUBSET", state, explanation, actions, preview
  };
}

export function interpretOfflineExample(input: string): OfflineIntentLabResult {
  if (typeof input !== "string" || input.length > max) {
    return result("UNSUPPORTED", "Only short educational instructions are accepted. Nothing was submitted.");
  }
  const clean = input.replace(/\s+/g, " ").trim().replace(/[.!?]$/, "").trim();
  if (!clean) return result("UNSUPPORTED", "Enter a sample financial instruction to practice.");

  if (/^(?:check|show) my balance$/i.test(clean) ||
      /^show (?:my )?(?:recent )?(?:activity|transactions)$/i.test(clean)) {
    return result("PROVIDER_READ_REQUIRED",
      "MONIFlow recognizes the read request, but this offline lab never reads a personal balance or transaction history.");
  }

  const clauses = clean.split(/\s+and\s+/i);
  if (clauses.length < 1 || clauses.length > 2) {
    return result("UNSUPPORTED", "The learning lab supports at most one withdrawal and one Laptop allocation.");
  }
  const actions: OfflineIntentAction[] = [];
  for (const clause of clauses) {
    const action = atomic(clause);
    if (!action) {
      return result("UNSUPPORTED",
        "Instruction not supported in this teaching subset. Use an example phrase with a clear naira amount, GTBank or Laptop; no partial plan is shown.");
    }
    if (actions.some(existing => existing.kind === action.kind)) {
      return result("UNSUPPORTED", "Repeated action type is ambiguous. No partial plan is shown.");
    }
    actions.push(action);
  }

  const withdrawal = actions.find((a): a is Extract<OfflineIntentAction,{kind:"BANK_WITHDRAWAL"}> => a.kind === "BANK_WITHDRAWAL");
  const saving = actions.find((a): a is Extract<OfflineIntentAction,{kind:"ALLOCATE_POCKET"}> => a.kind === "ALLOCATE_POCKET");
  const preview = evaluatePlayground(String(withdrawal?.amount ?? 0), String(saving?.amount ?? 0));
  if (preview.status !== "MATH_PREVIEW") {
    return result("BLOCKED",
      "The amount exceeds the fixed ₦300,000 educational balance. No resulting balance is displayed; no real funds were inspected.",
      actions, preview);
  }
  return result("RECOGNIZED",
    "The sample actions were recognized, but the resulting Money Plan is mathematical only. GTBank ownership, provider funds, MONI Guard and real approval are not verified.",
    actions, preview);
}
