import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyPracticeAction, initialPracticeLedger, practiceOpeningBalance,
  practicePockets, practiceSummary, type PracticeLedger
} from "./offline-pocket-ledger";

function allocate(ledger: PracticeLedger, pocket: "Laptop" | "Emergency" | "Rent", amountText: string) {
  return applyPracticeAction(ledger, { type: "ALLOCATE", pocket, amountText });
}
function withdraw(ledger: PracticeLedger, amountText: string) {
  return applyPracticeAction(ledger, { type: "WITHDRAW", amountText });
}
function release(ledger: PracticeLedger, pocket: "Laptop" | "Emergency" | "Rent", amountText: string) {
  return applyPracticeAction(ledger, { type: "RELEASE", pocket, amountText });
}
function safety(result: ReturnType<typeof applyPracticeAction>) {
  expect(result).toMatchObject({
    simulationOnly: true,
    bankVerified: false,
    financialOperationsEnabled: false,
    persistsAccountData: false
  });
  expect(practiceSummary(result.ledger)).toMatchObject({
    provenance: "LOCAL_SIMULATION",
    financialOperationsEnabled: false,
    realBalanceVerified: false
  });
}

describe("Phase 39 offline Pocket and Activity practice ledger", () => {
  it("starts every independent visit with an unsaved ₦300,000 illustration", () => {
    const a = initialPracticeLedger();
    const b = initialPracticeLedger();
    expect(practiceOpeningBalance).toBe(300000);
    expect(practicePockets).toEqual(["Laptop", "Emergency", "Rent"]);
    expect(practiceSummary(a)).toMatchObject({
      providerBalance: 300000, allocated: 0, available: 300000
    });
    expect(a.entries).toEqual([]);
    expect(a).not.toBe(b);
    expect(a.allocated).not.toBe(b.allocated);
  });

  it("models the six-stage tutorial arithmetic without moving provider money for a Pocket", () => {
    const base = initialPracticeLedger();
    const first = allocate(base, "Laptop", "20000");
    expect(first.status).toBe("SIMULATED");
    expect(practiceSummary(first.ledger)).toMatchObject({
      providerBalance: 300000, allocated: 20000, available: 280000
    });
    const second = withdraw(first.ledger, "40000");
    expect(second.status).toBe("SIMULATED");
    expect(practiceSummary(second.ledger)).toMatchObject({
      providerBalance: 260000, allocated: 20000, available: 240000
    });
    expect(second.ledger.entries.map(x => x.kind)).toEqual([
      "SIMULATED_WITHDRAWAL", "SIMULATED_ALLOCATION"
    ]);
    expect(base.entries).toHaveLength(0);
    safety(first); safety(second);
  });

  it("releasing a Pocket raises only available money, not the simulated provider amount", () => {
    const a = allocate(initialPracticeLedger(), "Rent", "100000");
    const b = allocate(a.ledger, "Emergency", "15000");
    const c = release(b.ledger, "Rent", "40000");
    expect(c.status).toBe("SIMULATED");
    expect(practiceSummary(c.ledger)).toMatchObject({
      providerBalance: 300000, allocated: 75000, available: 225000
    });
    expect(c.ledger.allocated).toEqual({ Laptop: 0, Emergency: 15000, Rent: 60000 });
    expect(c.ledger.entries[0]).toMatchObject({
      kind: "SIMULATED_RELEASE", amount: 40000
    });
    safety(c);
  });

  it("prevents spending money already reserved in another Pocket", () => {
    const a = allocate(initialPracticeLedger(), "Emergency", "200000");
    const b = withdraw(a.ledger, "100001");
    const c = allocate(a.ledger, "Laptop", "100001");
    expect(b.status).toBe("BLOCKED");
    expect(c.status).toBe("BLOCKED");
    expect(b.ledger).toBe(a.ledger);
    expect(c.ledger).toBe(a.ledger);
    expect(practiceSummary(b.ledger).available).toBe(100000);
    safety(b);
  });

  it("cannot release more than a selected Pocket holds", () => {
    const a = allocate(initialPracticeLedger(), "Laptop", "20000");
    expect(release(a.ledger, "Rent", "1").status).toBe("BLOCKED");
    const invalid = release(a.ledger, "Laptop", "20001");
    expect(invalid.status).toBe("BLOCKED");
    expect(invalid.ledger).toBe(a.ledger);
    safety(invalid);
  });

  it("rejects malformed or zero amounts atomically", () => {
    for (const amount of [
      "", " ", "0", "00", "040000", "-1", "+1", "1.2", "40,000",
      "₦40000", "1e3", "Infinity", "9999999999", "1 0"
    ]) {
      const ledger = initialPracticeLedger();
      const result = withdraw(ledger, amount);
      expect(result.status, amount).toBe("BLOCKED");
      expect(result.ledger, amount).toBe(ledger);
      expect(result.ledger.entries).toHaveLength(0);
      safety(result);
    }
  });

  it("accepts exactly all available example money but blocks one naira more", () => {
    const a = allocate(initialPracticeLedger(), "Laptop", "150000");
    const b = withdraw(a.ledger, "150000");
    expect(b.status).toBe("SIMULATED");
    expect(practiceSummary(b.ledger)).toMatchObject({
      providerBalance: 150000, allocated: 150000, available: 0
    });
    expect(withdraw(b.ledger, "1").status).toBe("BLOCKED");
    expect(allocate(b.ledger, "Rent", "1").status).toBe("BLOCKED");
    safety(b);
  });

  it("caps ephemeral history to avoid unlimited memory growth", () => {
    let ledger = initialPracticeLedger();
    for (let i = 0; i < 30; i++) {
      const next = allocate(ledger, "Laptop", "1");
      expect(next.status).toBe("SIMULATED");
      ledger = next.ledger;
    }
    expect(ledger.entries).toHaveLength(30);
    expect(ledger.entries[0].id).toBe(30);
    const blocked = withdraw(ledger, "1");
    expect(blocked.status).toBe("BLOCKED");
    expect(blocked.ledger).toBe(ledger);
    safety(blocked);
  });

  it("reset discards previous practice actions without persisting to accounts", () => {
    const a = allocate(initialPracticeLedger(), "Laptop", "20000");
    const b = withdraw(a.ledger, "40000");
    const cleared = applyPracticeAction(b.ledger, { type: "RESET" });
    expect(cleared.status).toBe("RESET");
    expect(cleared.ledger).toEqual(initialPracticeLedger());
    expect(cleared.ledger).not.toBe(b.ledger);
    expect(b.ledger.entries).toHaveLength(2);
    safety(cleared);
  });

  it("refuses inconsistent state and cannot recover it through financial changes", () => {
    const corrupt: PracticeLedger = {
      ...initialPracticeLedger(),
      allocated: { Laptop: 300001, Emergency: 0, Rent: 0 }
    };
    const result = withdraw(corrupt, "1");
    expect(result.status).toBe("BLOCKED");
    expect(result.ledger).toBe(corrupt);
    expect(applyPracticeAction(corrupt, { type: "RESET" }).status).toBe("RESET");
  });

  it("keeps source and route segregated from real account, provider, signing and persistence", () => {
    const service = readFileSync("apps/mobile/services/offline-pocket-ledger.ts", "utf8");
    const screen = readFileSync("apps/mobile/app/learn/pockets.tsx", "utf8");
    const hub = readFileSync("apps/mobile/app/learn/index.tsx", "utf8");
    expect(service + screen).not.toMatch(/from ["'][^"']*(?:api-fetch|auth-session|bmoni-device|wallet-dashboard|sandbox-api|execution|AsyncStorage|money-plan|banking|react-query)[^"']*["']/);
    expect(service + screen).not.toMatch(/\b(?:fetch|apiFetch|localStorage|signTransactionHash|initWallet|signMessage|setPin)\s*\(/);
    expect(screen).toContain("LOCAL MEMORY ONLY");
    expect(screen).toContain("NOT SAVED");
    expect(screen).toContain("Return to Learning & Practice");
    expect(hub).toContain('router.push("/learn/pockets")');
    expect(screen).toContain('router.replace("/learn")');
  });
});
