import { describe, expect, it } from "vitest";

import { computeAvailableToSpend } from "./spendable.js";

describe("computeAvailableToSpend", () => {
  it("subtracts internal allocations from provider balance", () => {
    expect(computeAvailableToSpend(260_000, 20_000)).toBe(240_000);
  });

  it("never returns a negative spendable balance", () => {
    expect(computeAvailableToSpend(10_000, 20_000)).toBe(0);
  });

  it("rejects invalid accounting values", () => {
    expect(() => computeAvailableToSpend(-1, 0)).toThrow();
    expect(() => computeAvailableToSpend(1, -1)).toThrow();
  });
});
