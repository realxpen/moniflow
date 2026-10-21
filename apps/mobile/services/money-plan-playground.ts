/**
 * Standalone, in-memory educational arithmetic. No wallet state, bank
 * verification, provider API, financial permissions, or real plan exists here.
 *
 * Amounts are whole NGN units. We deliberately refuse formatting, fractional
 * amounts, signs, scientific notation and unbounded values rather than
 * silently coercing an instruction into a different monetary amount.
 */
export const playgroundOpeningBalance = 300_000;
export const playgroundMaximumInput = 1_000_000_000;

export const playgroundPresets = [
  { id: "standard", label: "Everyday example", withdrawal: "40000", allocation: "20000" },
  { id: "savings", label: "Save more", withdrawal: "15000", allocation: "100000" },
  { id: "overspend", label: "Test overspending", withdrawal: "250000", allocation: "100000" }
] as const;

export type PlaygroundCheck = {
  id: "amounts" | "action" | "balance" | "destination";
  passed: boolean;
  label: string;
  detail: string;
};

export type PlaygroundResult = {
  simulationOnly: true;
  financialOperationsEnabled: false;
  bankDestinationVerified: false;
  status: "MATH_PREVIEW" | "BLOCKED";
  openingBalance: number;
  withdrawal: number | null;
  allocation: number | null;
  totalCommitted: number | null;
  providerAfter: number | null;
  availableAfter: number | null;
  checks: ReadonlyArray<PlaygroundCheck>;
};

function parseWholeNaira(input: string): number | null {
  if (!/^(?:0|[1-9][0-9]{0,9})$/.test(input)) return null;
  const parsed = Number(input);
  return Number.isSafeInteger(parsed) && parsed <= playgroundMaximumInput ? parsed : null;
}

/**
 * A mathematically valid example is NOT a MONI Guard ALLOW verdict.
 * Bank ownership, spendable provider funds, KYC and the human approval
 * system are unverified and cannot be unlocked by changing example numbers.
 */
export function evaluatePlayground(withdrawalText: string, allocationText: string): PlaygroundResult {
  const withdrawal = parseWholeNaira(withdrawalText);
  const allocation = parseWholeNaira(allocationText);
  const amountsValid = withdrawal !== null && allocation !== null;
  const hasAction = amountsValid && (withdrawal > 0 || allocation > 0);
  const totalCommitted = amountsValid ? withdrawal + allocation : null;
  const sufficient = totalCommitted !== null && totalCommitted <= playgroundOpeningBalance;
  const valid = amountsValid && hasAction && sufficient;
  return {
    simulationOnly: true,
    financialOperationsEnabled: false,
    bankDestinationVerified: false,
    status: valid ? "MATH_PREVIEW" : "BLOCKED",
    openingBalance: playgroundOpeningBalance,
    withdrawal,
    allocation,
    totalCommitted,
    providerAfter: valid ? playgroundOpeningBalance - withdrawal : null,
    availableAfter: valid ? playgroundOpeningBalance - totalCommitted : null,
    checks: [
      {
        id: "amounts",
        passed: amountsValid,
        label: "Whole-naira example amounts",
        detail: amountsValid
          ? "Numbers are whole, nonnegative NGN amounts in the practice limit."
          : "Enter plain whole naira numbers (0–1,000,000,000) without commas, signs or decimals."
      },
      {
        id: "action",
        passed: hasAction,
        label: "At least one example action",
        detail: hasAction
          ? "One or both hypothetical actions are present."
          : "Enter a positive withdrawal or pocket allocation to preview an example."
      },
      {
        id: "balance",
        passed: sufficient,
        label: "Illustrative funds preservation",
        detail: sufficient
          ? "Withdrawal plus internal allocation does not exceed the fixed ₦300,000 example."
          : "Example commitments exceed the illustration or the inputs are invalid; no resulting balance is shown."
      },
      {
        id: "destination",
        passed: false,
        label: "Real GTBank destination ownership",
        detail: "NOT VERIFIED. The bank label is hypothetical; these calculations never authorize a withdrawal."
      }
    ]
  };
}
