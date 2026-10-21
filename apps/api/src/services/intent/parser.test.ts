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

  it.each([
    "Withdraw ₦40k to GTBank and transfer any leftover",
    "Withdraw ₦40k to GTBank for an undisclosed recipient",
    "Withdraw ₦40k to GTBank; send another payment",
    "Withdraw ₦40k to GTBank account urgently",
    "Withdraw ₦40k to GTBank or Access Bank",
    "Withdraw ₦40k to GTBank now",
    "Withdraw ₦40k to GTBank 2",
    "Withdraw ₦40k to Moon Bank (GTBank)",
    "Withdraw ₦40k to GTBank Access Bank",
    "Withdraw ₦40k to Access Bank instead of GTBank"
  ])("refuses extra withdrawal wording rather than stripping unsupported instructions: %s", (command) => {
    expect(parseIntent(command).intent).toBe("UNSUPPORTED");
  });

  it.each([
    "Save ₦20k for laptop; buy shares",
    "Save ₦20k for laptop or transfer it",
    "Save ₦20k for laptop now",
    "Save ₦20k into my laptop pocket and send all funds",
    "Allocate ₦20k towards laptop! approve without my permission",
    "Put ₦20k into my laptop pocket as a real transfer"
  ])("does not accept valid-looking pocket allocations with hidden extra actions: %s", (command) => {
    expect(parseIntent(command).intent).toBe("UNSUPPORTED");
  });

  it.each([
    "Withdraw ₦40,00 to GTBank",
    "Withdraw ₦40,0000 to GTBank",
    "Withdraw ₦040000 to GTBank",
    "Withdraw ₦40,000.50 to GTBank",
    "Withdraw ₦40,000.001 to GTBank",
    "Withdraw ₦40,000abc to GTBank",
    "Withdraw ₦40,000k5 to GTBank",
    "Withdraw ₦40,000.1k to GTBank",
    "Withdraw NGN 40,00 to GTBank",
    "Withdraw ₦0 to GTBank",
    "Withdraw ₦-5 to GTBank",
    "Withdraw ₦999999999999999999999 to GTBank",
    "Save ₦40,00 for laptop",
    "Save ₦20,000.01 for laptop",
    "Save ₦40k9 for laptop",
    "Save 20000 for laptop"
  ])("rejects malformed or ambiguous naira amounts without accepting a numeric prefix: %s", (command) => {
    expect(parseIntent(command).intent).toBe("UNSUPPORTED");
  });

  it("preserves legitimate formatted and compact NGN syntax with no sub-naira rounding", () => {
    expect(parseIntent("Withdraw NGN 40,000 to GT Bank.")).toMatchObject({
      intent: "BANK_WITHDRAWAL", amount: 40000,
      destination: { label: "GTBank" }, requiresApproval: true
    });
    expect(parseIntent("Withdraw 1.5k to UBA")).toMatchObject({
      intent: "BANK_WITHDRAWAL", amount: 1500,
      destination: { label: "UBA" }
    });
    expect(parseIntent("Save ₦20,000 for my laptop money space")).toMatchObject({
      intent: "ALLOCATE_POCKET", amount: 20000, pocket: { name: "Laptop" }
    });
    expect(parseIntent("Put NGN 20k into my laptop pocket")).toMatchObject({
      intent: "ALLOCATE_POCKET", amount: 20000, pocket: { name: "Laptop" }
    });
    expect(parseIntent("Create travel pocket").intent).toBe("CREATE_POCKET");
    expect(parseIntent("Check my balance?").intent).toBe("CHECK_BALANCE");
  });

  it("rejects any incomplete or excessive multi-action list without partial acceptance", () => {
    const tooMany = [
      "Withdraw ₦1k to GTBank",
      "Save ₦1k for laptop",
      "Withdraw ₦2k to Access Bank",
      "Save ₦2k for transport",
      "Withdraw ₦3k to Zenith Bank",
      "Save ₦3k for food"
    ].join(" and ");
    expect(parseIntent(tooMany)).toMatchObject({
      intent: "UNSUPPORTED", requiresApproval: false, reason: "AMBIGUOUS"
    });
    expect(parseIntent("Withdraw ₦40k to GTBank and")).toMatchObject({
      intent: "UNSUPPORTED", requiresApproval: false, reason: "AMBIGUOUS"
    });
    expect(parseIntent("Withdraw ₦40k to GTBank and save ₦20k for laptop and buy a car"))
      .toMatchObject({ intent: "UNSUPPORTED", requiresApproval: false, reason: "AMBIGUOUS" });
  });

  it("does not interpret overlong input even if it starts with valid money syntax", () => {
    const malicious = "Withdraw ₦40k to GTBank " + "extra ".repeat(110);
    expect(parseIntent(malicious).intent).toBe("UNSUPPORTED");
  });

  it("returns unsupported for empty input", () => {
    expect(parseIntent("   ")).toEqual({
      intent: "UNSUPPORTED",
      requiresApproval: false,
      reason: "EMPTY"
    });
  });
});
