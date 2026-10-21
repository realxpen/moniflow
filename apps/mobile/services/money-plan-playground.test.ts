import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  evaluatePlayground, playgroundOpeningBalance, playgroundMaximumInput, playgroundPresets
} from "./money-plan-playground";

const source = (file: string) => readFileSync(file, "utf8");
const check = (result: ReturnType<typeof evaluatePlayground>, id: string) =>
  result.checks.find(c => c.id === id);

function alwaysSafe(result: ReturnType<typeof evaluatePlayground>) {
  expect(result.simulationOnly).toBe(true);
  expect(result.financialOperationsEnabled).toBe(false);
  expect(result.bankDestinationVerified).toBe(false);
  expect(check(result, "destination")).toMatchObject({ passed: false });
}

describe("Phase 33E offline Money Plan Playground", () => {
  it("matches the canonical tutorial's arithmetic without claiming provider confirmation", () => {
    expect(playgroundOpeningBalance).toBe(300000);
    const result = evaluatePlayground("40000", "20000");
    expect(result.status).toBe("MATH_PREVIEW");
    expect(result).toMatchObject({
      withdrawal: 40000, allocation: 20000, totalCommitted: 60000,
      providerAfter: 260000, availableAfter: 240000
    });
    alwaysSafe(result);
  });

  it("keeps the entire internal allocation separate from external movement", () => {
    const onlySavings = evaluatePlayground("0", "20000");
    expect(onlySavings).toMatchObject({
      status: "MATH_PREVIEW", providerAfter: 300000, availableAfter: 280000
    });
    const onlyWithdrawal = evaluatePlayground("40000", "0");
    expect(onlyWithdrawal).toMatchObject({
      status: "MATH_PREVIEW", providerAfter: 260000, availableAfter: 260000
    });
    alwaysSafe(onlySavings);
    alwaysSafe(onlyWithdrawal);
  });

  it("accepts the upper mathematical boundary but rejects even a one-naira overspend", () => {
    expect(evaluatePlayground("250000", "50000")).toMatchObject({
      status: "MATH_PREVIEW", providerAfter: 50000, availableAfter: 0
    });
    const blocked = evaluatePlayground("250001", "50000");
    expect(blocked.status).toBe("BLOCKED");
    expect(blocked.availableAfter).toBeNull();
    expect(blocked.providerAfter).toBeNull();
    expect(check(blocked, "balance")?.passed).toBe(false);
    alwaysSafe(blocked);
  });

  it("rejects no-op example with both amounts zero", () => {
    const result = evaluatePlayground("0", "0");
    expect(result.status).toBe("BLOCKED");
    expect(check(result, "action")?.passed).toBe(false);
    expect(result.availableAfter).toBeNull();
    alwaysSafe(result);
  });

  it("does not coerce malformed amounts into monetary outcomes", () => {
    for (const invalid of [
      "", " ", "040000", "1.5", "-1", "+1", "1e3",
      "40,000", "₦40000", "NaN", "Infinity", "99999999999", "1000000001", "1 0", "1\n2"
    ]) {
      const result = evaluatePlayground(invalid, "20000");
      expect(result.status, `accepted invalid money input: ${JSON.stringify(invalid)}`).toBe("BLOCKED");
      expect(result.withdrawal).toBeNull();
      expect(result.totalCommitted).toBeNull();
      expect(result.providerAfter).toBeNull();
      expect(result.availableAfter).toBeNull();
      alwaysSafe(result);
    }
  });

  it("never displays an arithmetic result for a large but syntactically valid overspend", () => {
    const high = evaluatePlayground(String(playgroundMaximumInput), "1");
    expect(high.withdrawal).toBe(playgroundMaximumInput);
    expect(high.status).toBe("BLOCKED");
    expect(high.providerAfter).toBeNull();
    expect(high.availableAfter).toBeNull();
    alwaysSafe(high);
  });

  it("presets include normal, savings-heavy, and blocked-overdraft cases", () => {
    expect(playgroundPresets.map(p => p.id)).toEqual(["standard", "savings", "overspend"]);
    expect(evaluatePlayground(playgroundPresets[0].withdrawal, playgroundPresets[0].allocation).status)
      .toBe("MATH_PREVIEW");
    expect(evaluatePlayground(playgroundPresets[1].withdrawal, playgroundPresets[1].allocation).status)
      .toBe("MATH_PREVIEW");
    expect(evaluatePlayground(playgroundPresets[2].withdrawal, playgroundPresets[2].allocation).status)
      .toBe("BLOCKED");
  });

  it("educational calculator never imports finance APIs, wallet signing or persistence", () => {
    const module = source("apps/mobile/services/money-plan-playground.ts");
    const screen = source("apps/mobile/app/learn/playground.tsx");
    const hub = source("apps/mobile/app/learn/index.tsx");
    expect(module + screen).not.toMatch(/from ["'][^"']*(?:api-fetch|bmoni-device|banking|execution|money-plan\.ts|approval|wallet-dashboard|sandbox-api|AsyncStorage)[^"']*["']/);
    expect(module + screen).not.toMatch(/\b(?:fetch|signTransactionHash|setPin|initWallet|signMessage|apiFetch|localStorage)\s*\(/);
    expect(module + screen).toContain("NOT A MONI GUARD ALLOW VERDICT");
    expect(screen).toContain('router.replace("/learn")');
    expect(hub).toContain('router.push("/learn/playground")');
  });

  it("two independently blocked values cannot accidentally unlock a math result", () => {
    for (const withdrawal of ["", "-1000", "500000"]) {
      for (const allocation of ["", "300001", "NaN"]) {
        const result = evaluatePlayground(withdrawal, allocation);
        expect(result.status).toBe("BLOCKED");
        expect(result.availableAfter).toBeNull();
        alwaysSafe(result);
      }
    }
  });
});
