import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { moneyInCents } from "./execution.js";
import { SqliteExecutionRepository } from "./sqlite-execution.js";

const user = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const one = "33333333-3333-4333-8333-333333333333";
const two = "44444444-4444-4444-8444-444444444444";
const hash = "f".repeat(64);
const claim = (planId: string, reservedAmount: number, localUserId = user, spendableCeiling = 100000) => ({
  planId, localUserId, approvedPlanHash: hash, providerBankAccountId: "trusted-account",
  amount: Math.min(reservedAmount, 40000), reservedAmount, spendableCeiling
});
const opened: SqliteExecutionRepository[] = [];
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(opened.splice(0).map(x => x.close()));
  dirs.splice(0).forEach(x => rmSync(x, { recursive: true, force: true }));
});

describe("Cross-plan spendable reservations — SQLite", () => {
  it("serializes two different plans competing for the same 100k spendable across DB connections", async () => {
    const folder = mkdtempSync(join(tmpdir(), "moniflow-budget-"));
    dirs.push(folder);
    const url = "file:" + join(folder, "test.sqlite");
    const a = new SqliteExecutionRepository(url);
    const b = new SqliteExecutionRepository(url);
    opened.push(a, b);
    const results = await Promise.all([
      a.claimSpendablePreparation(claim(one, 70000)),
      b.claimSpendablePreparation(claim(two, 60000))
    ]);
    expect(results).toContain("CLAIMED");
    expect(results).toContain("INSUFFICIENT_CAPACITY");
    const winningPlan = results[0] === "CLAIMED" ? one : two;
    expect((await a.findPreparationHold(winningPlan, user))?.state).toBe("RESERVED");
  });

  it("reserves both withdrawals and internal pocket allocations without double-counting after restart", async () => {
    const folder = mkdtempSync(join(tmpdir(), "moniflow-restart-budget-"));
    dirs.push(folder);
    const url = "file:" + join(folder, "money.sqlite");
    const a = new SqliteExecutionRepository(url);
    expect(await a.claimSpendablePreparation(claim(one, 90000))).toBe("CLAIMED");
    await a.close();
    const restarted = new SqliteExecutionRepository(url);
    opened.push(restarted);
    expect(await restarted.claimSpendablePreparation(claim(two, 20000)))
      .toBe("INSUFFICIENT_CAPACITY");
    await restarted.recordPreparationOutcome(one, user, "PROVIDER_OUTCOME_UNKNOWN");
    expect(await restarted.claimSpendablePreparation(claim(two, 20000)))
      .toBe("INSUFFICIENT_CAPACITY");
    expect(await restarted.claimSpendablePreparation(claim(two, 10000))).toBe("CLAIMED");
    expect(await restarted.claimSpendablePreparation(claim(two, 10000))).toBe("INSUFFICIENT_CAPACITY");
  });

  it("does not double-spend 1 kobo and isolates independent owners", async () => {
    const db = new SqliteExecutionRepository(":memory:");
    opened.push(db);
    expect(await db.claimSpendablePreparation(claim(one, 99999.99))).toBe("CLAIMED");
    expect(await db.claimSpendablePreparation(claim(two, 0.02))).toBe("INSUFFICIENT_CAPACITY");
    expect(await db.claimSpendablePreparation(claim(two, 0.01))).toBe("CLAIMED");
    expect(await db.claimSpendablePreparation(claim(two, 0.01, other)))
      .toBe("CONFLICT"); // plan id is globally unique across owners
    expect(await db.claimSpendablePreparation(claim("55555555-5555-4555-8555-555555555555", 80000, other)))
      .toBe("CLAIMED");
  });

  it("fails closed for old holds created without reserved amounts", async () => {
    const db = new SqliteExecutionRepository(":memory:");
    opened.push(db);
    expect(await db.claimPreparation({
      planId: one, localUserId: user, approvedPlanHash: hash,
      providerBankAccountId: "legacy-bank", amount: 40000
    })).toBe(true);
    expect(await db.claimSpendablePreparation(claim(two, 100)))
      .toBe("UNRECONCILED_LEGACY");
    expect(await db.findPreparationHold(two, user)).toBeNull();
  });

  it("rejects fractional kobo, invalid totals and negative values before a hold can be written", async () => {
    const db = new SqliteExecutionRepository(":memory:");
    opened.push(db);
    for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.001]) {
      await expect(db.claimSpendablePreparation(claim(one, invalid))).rejects.toThrow();
    }
    expect(() => moneyInCents(1.01)).not.toThrow();
    expect(() => moneyInCents(1.001)).toThrow();
    await expect(db.claimSpendablePreparation({
      ...claim(one, 20000), amount: 30000
    })).rejects.toThrow();
    expect(await db.findPreparationHold(one, user)).toBeNull();
  });
});
