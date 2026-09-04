import { describe, expect, it } from "vitest";

import { parseIntent } from "./parser.js";

describe("parseIntent", () => {
  it("parses the canonical bank withdrawal demo phrase", () => {
    expect(parseIntent("Withdraw ₦40,000 to my GTBank account")).toEqual({
      intent: "BANK_WITHDRAWAL",
      currency: "NGN",
      amount: 40000,
      destination: {
        kind: "SAVED_BANK",
        label: "GTBank"
      },
      requiresApproval: true
    });
  });

  it("parses compact naira amounts deterministically", () => {
    expect(parseIntent("Withdraw ₦40k to GTBank")).toMatchObject({
      intent: "BANK_WITHDRAWAL",
      amount: 40000
    });
  });

  it("parses a multi-action withdrawal and pocket allocation", () => {
    expect(parseIntent("Withdraw ₦40k to GTBank and save ₦20k for laptop")).toEqual({
      intent: "MULTI_ACTION",
      actions: [
        {
          intent: "BANK_WITHDRAWAL",
          currency: "NGN",
          amount: 40000,
          destination: { kind: "SAVED_BANK", label: "GTBank" },
          requiresApproval: true
        },
        {
          intent: "ALLOCATE_POCKET",
          currency: "NGN",
          amount: 20000,
          pocket: { name: "Laptop" },
          requiresApproval: false
        }
      ],
      requiresApproval: true
    });
  });

  it.each([
    ["Check my balance", "CHECK_BALANCE"],
    ["How much do I have?", "CHECK_BALANCE"],
    ["Create a pocket for laptop", "CREATE_POCKET"],
    ["Create travel pocket", "CREATE_POCKET"],
    ["Save ₦20k for laptop", "ALLOCATE_POCKET"],
    ["Show my recent activity", "SHOW_ACTIVITY"],
    ["Show transactions", "SHOW_ACTIVITY"]
  ])("maps %s to %s", (phrase, expectedIntent) => {
    expect(parseIntent(phrase).intent).toBe(expectedIntent);
  });

  it("does not guess an unknown bank", () => {
    expect(parseIntent("Withdraw ₦40k to Moon Bank")).toEqual({
      intent: "UNSUPPORTED",
      requiresApproval: false,
      reason: "INCOMPLETE_ACTION"
    });
  });

  it("does not partially accept a multi-action command", () => {
    expect(parseIntent("Withdraw ₦40k to GTBank and buy me bitcoin")).toEqual({
      intent: "UNSUPPORTED",
      requiresApproval: false,
      reason: "AMBIGUOUS"
    });
  });

  it("does not infer an amount without an explicit naira marker or compact suffix", () => {
    expect(parseIntent("Withdraw 40000 to GTBank")).toEqual({
      intent: "UNSUPPORTED",
      requiresApproval: false,
      reason: "INCOMPLETE_ACTION"
    });
  });

  it("returns unsupported for empty input", () => {
    expect(parseIntent("   ")).toEqual({
      intent: "UNSUPPORTED",
      requiresApproval: false,
      reason: "EMPTY"
    });
  });
});
