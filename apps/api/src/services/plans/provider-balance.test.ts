import { describe, expect, it } from "vitest";
import { readCngnAvailableBalance } from "./provider-balance.js";

describe("Unambiguous financial provider CNGN balance decoding", () => {
  it("reads documented nested fixtures with valid whole and two-decimal CNGN", () => {
    expect(readCngnAvailableBalance({ data: { balances: [{ currency: "CNGN", availableBalance: "300000.00" }] } })).toBe(300000);
    expect(readCngnAvailableBalance([{ asset: "NGN", availableBalance: "9000" }, { currency: "CNGN", available: "1,234.56" }])).toBe(1234.56);
    expect(readCngnAvailableBalance({ currency: "CNGN", balance: 0 })).toBe(0);
    expect(readCngnAvailableBalance({ currency: "CNGN", amount: 27.5 })).toBe(27.5);
  });

  it("never guesses between multiple CNGN accounts or selects an unverified total", () => {
    expect(readCngnAvailableBalance([
      { currency: "CNGN", availableBalance: "50.00" },
      { currency: "CNGN", availableBalance: "300000.00" }
    ])).toBeNull();
    expect(readCngnAvailableBalance({ currency: "USDT", availableBalance: "300000" })).toBeNull();
    expect(readCngnAvailableBalance({ currency: "CNGN", available: "invalid", total: "5000.00" })).toBeNull();
  });

  it.each([
    "-20", "+20", "5e5", "NaN", "Infinity", "1,2", "1,23,456",
    "3.145", "0.000", "10.999", "1,0000", "01", " 20",
    "20 ", "₦20", "999999999999999999999999", "1_000", "10,00.00"
  ])("rejects malformed or ambiguous provider amount: %s", (raw) => {
    expect(readCngnAvailableBalance({ currency: "CNGN", availableBalance: raw })).toBeNull();
  });

  it("does not accidentally recognize deeply nested circular objects as multiple accounts", () => {
    const data: Record<string, unknown> = { currency: "CNGN", availableBalance: "20.00" };
    data.self = data;
    expect(readCngnAvailableBalance({ data })).toBe(20);
  });

  it("fails closed when provider input is not an object or contains no amount", () => {
    for (const value of [null, undefined, "", 10, [], {}, { currency: "CNGN" }]) {
      expect(readCngnAvailableBalance(value)).toBeNull();
    }
  });
});
