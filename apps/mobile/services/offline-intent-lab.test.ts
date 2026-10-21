import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { interpretOfflineExample, offlineIntentExamples } from "./offline-intent-lab";

const source = (path: string) => readFileSync(path, "utf8");

const alwaysSafe = (r: ReturnType<typeof interpretOfflineExample>) => {
  expect(r).toMatchObject({
    simulationOnly: true,
    realExecutionAllowed: false,
    bankVerified: false,
    parsingMode: "OFFLINE_EDUCATIONAL_SUBSET"
  });
  expect(r.preview?.financialOperationsEnabled ?? false).toBe(false);
  expect(r.preview?.bankDestinationVerified ?? false).toBe(false);
};

describe("Phase 33F Offline Intent Lab", () => {
  it("interprets the canonical two-step instruction without provider actions", () => {
    const r = interpretOfflineExample(offlineIntentExamples[0].command);
    expect(r.state).toBe("RECOGNIZED");
    expect(r.actions).toEqual([
      { kind: "BANK_WITHDRAWAL", amount: 40000, bank: "GTBank", verified: false },
      { kind: "ALLOCATE_POCKET", amount: 20000, pocket: "Laptop", providerMovement: false }
    ]);
    expect(r.preview).toMatchObject({
      status: "MATH_PREVIEW", withdrawal: 40000, allocation: 20000,
      providerAfter: 260000, availableAfter: 240000
    });
    alwaysSafe(r);
  });

  it("accepts only complete single actions and separates external movement from bookkeeping", () => {
    const external = interpretOfflineExample("Withdraw NGN 15,000 to GTBank.");
    expect(external).toMatchObject({
      state: "RECOGNIZED", preview: { providerAfter: 285000, availableAfter: 285000 }
    });
    const internal = interpretOfflineExample("Save ₦100,000 for my laptop.");
    expect(internal).toMatchObject({
      state: "RECOGNIZED", preview: { providerAfter: 300000, availableAfter: 200000 }
    });
    expect(external.actions).toHaveLength(1);
    expect(internal.actions).toHaveLength(1);
    alwaysSafe(external);
    alwaysSafe(internal);
  });

  it("allows order reversal without confusing withdrawal and allocation", () => {
    const r = interpretOfflineExample(
      "allocate ₦20,000 towards Laptop and withdraw ₦40,000 to my GTBank account."
    );
    expect(r.state).toBe("RECOGNIZED");
    expect(r.actions.map(a => a.kind)).toEqual(["ALLOCATE_POCKET", "BANK_WITHDRAWAL"]);
    expect(r.preview?.availableAfter).toBe(240000);
    alwaysSafe(r);
  });

  it("blocks overspending and withholds all calculated resulting balances", () => {
    const r = interpretOfflineExample(offlineIntentExamples[3].command);
    expect(r.state).toBe("BLOCKED");
    expect(r.actions).toHaveLength(2);
    expect(r.preview).toMatchObject({
      status: "BLOCKED", providerAfter: null, availableAfter: null
    });
    alwaysSafe(r);
  });

  it.each([
    ["", "UNSUPPORTED"],
    ["Withdraw 40000 to GTBank", "UNSUPPORTED"],
    ["Withdraw ₦40,000 to Moon Bank", "UNSUPPORTED"],
    ["Withdraw ₦40,000 to Access Bank", "UNSUPPORTED"],
    ["Withdraw ₦40,000 to GTBank and buy bitcoin", "UNSUPPORTED"],
    ["Withdraw ₦40,000 to GTBank and save ₦10,000 for travel", "UNSUPPORTED"],
    ["Withdraw ₦40,000 to GTBank and withdraw ₦10,000 to GTBank", "UNSUPPORTED"],
    ["Save ₦10,000 for my laptop and save ₦20,000 for my laptop", "UNSUPPORTED"],
    ["Withdraw ₦40,000 to GTBank and save ₦20,000 for my laptop and save ₦1,000 for my laptop", "UNSUPPORTED"],
    ["Withdraw ₦040,000 to GTBank", "UNSUPPORTED"],
    ["Withdraw ₦40,00 to GTBank", "UNSUPPORTED"],
    ["Withdraw ₦1.5 to GTBank", "UNSUPPORTED"],
    ["Withdraw ₦-1 to GTBank", "UNSUPPORTED"],
    ["Withdraw ₦0 to GTBank", "UNSUPPORTED"],
    ["Withdraw ₦1000000001 to GTBank", "UNSUPPORTED"],
    ["Withdraw ₦40,000 to GTBank; also transfer everything", "UNSUPPORTED"],
    ["Create a wallet for me", "UNSUPPORTED"],
    ["Show me my PIN", "UNSUPPORTED"]
  ] as const)("fails closed on unsafe/ambiguous instruction %s", (phrase, state) => {
    const r = interpretOfflineExample(phrase);
    expect(r.state).toBe(state);
    expect(r.actions).toEqual([]);
    expect(r.preview).toBeNull();
    alwaysSafe(r);
  });

  it("recognizes read intent but never invents actual balance or activity", () => {
    for (const phrase of ["Check my balance.", "Show my recent activity.", "Show transactions"]) {
      const r = interpretOfflineExample(phrase);
      expect(r.state).toBe("PROVIDER_READ_REQUIRED");
      expect(r.actions).toEqual([]);
      expect(r.preview).toBeNull();
      alwaysSafe(r);
    }
  });

  it("refuses excessively long text rather than attempting broad natural-language interpretation", () => {
    const r = interpretOfflineExample("Withdraw ₦40,000 to GTBank ".repeat(20));
    expect(r.state).toBe("UNSUPPORTED");
    expect(r.actions).toHaveLength(0);
    expect(r.preview).toBeNull();
    alwaysSafe(r);
  });

  it("accepts only this deliberately bounded demo grammar", () => {
    for (const example of offlineIntentExamples) {
      const r = interpretOfflineExample(example.command);
      const expected = ({
        combined: "RECOGNIZED", withdrawal: "RECOGNIZED",
        savings: "RECOGNIZED", insufficient: "BLOCKED",
        unknown: "UNSUPPORTED", balance: "PROVIDER_READ_REQUIRED"
      } as const)[example.id];
      expect(r.state).toBe(expected);
      alwaysSafe(r);
    }
  });

  it("keeps entered text, financial APIs, device signing and storage outside the lab", () => {
    const logic = source("apps/mobile/services/offline-intent-lab.ts");
    const screen = source("apps/mobile/app/learn/intent.tsx");
    const hub = source("apps/mobile/app/learn/index.tsx");
    expect(logic + screen).not.toMatch(
      /from ["'][^"']*(api-fetch|bmoni-device|banking|execution|money-plan\.ts|approval|wallet-dashboard|sandbox-api|AsyncStorage)[^"']*["']/
    );
    expect(logic + screen).not.toMatch(
      /\b(?:fetch|apiFetch|signTransactionHash|signMessage|initWallet|setPin|localStorage)\s*\(/
    );
    expect(screen).toContain("NOT A SERVER MONEY PLAN");
    expect(screen).toContain('router.replace("/learn")');
    expect(hub).toContain('router.push("/learn/intent")');
  });
});
