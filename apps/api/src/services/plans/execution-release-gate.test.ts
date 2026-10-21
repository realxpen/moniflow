import { describe, expect, it } from "vitest";
import { canUseFinancialExecution, REAL_EXECUTION_RELEASE_CODE } from "./execution-release-gate.js";

describe("Unreleased real BMONI execution safety boundary", () => {
  it("blocks all real BMONI provider execution in both production and development", () => {
    expect(canUseFinancialExecution("bmoni", "production")).toBe(false);
    expect(canUseFinancialExecution("bmoni", "development")).toBe(false);
    expect(REAL_EXECUTION_RELEASE_CODE).toBe("BMONI_FINANCIAL_EXECUTION_NOT_RELEASED");
  });

  it("keeps isolated mock unit tests and the purely simulated provider workable", () => {
    expect(canUseFinancialExecution("bmoni", "test")).toBe(true);
    expect(canUseFinancialExecution("moniflow-sandbox", "test")).toBe(true);
    expect(canUseFinancialExecution("moniflow-sandbox", "development")).toBe(true);
    expect(canUseFinancialExecution("moniflow-sandbox", "production")).toBe(true);
  });
});
