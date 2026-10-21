import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { SqliteExecutionRepository } from "./sqlite-execution.js";

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";
const planId = "33333333-3333-4333-8333-333333333333";
const hash = "f".repeat(64);
const input = {
  planId, localUserId: userId, approvedPlanHash: hash,
  providerBankAccountId: "verified-bank-id", amount: 40000
};

const openRepositories: SqliteExecutionRepository[] = [];
const folders: string[] = [];
afterEach(async () => {
  await Promise.all(openRepositories.splice(0).map(r => r.close()));
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

describe("Durable SQLite provider preparation holds", () => {
  it("permits only one claim across separate connections to the same SQLite file", async () => {
    const folder = mkdtempSync(join(tmpdir(), "moniflow-hold-"));
    folders.push(folder);
    const url = "file:" + join(folder, "hold.sqlite");
    const a = new SqliteExecutionRepository(url);
    const b = new SqliteExecutionRepository(url);
    openRepositories.push(a, b);
    const attempts = await Promise.all([a.claimPreparation(input), b.claimPreparation(input)]);
    expect(attempts.filter(Boolean)).toHaveLength(1);
    expect(await a.findPreparationHold(planId, userId)).toMatchObject({
      planId, state: "RESERVED", approvedPlanHash: hash,
      providerBankAccountId: "verified-bank-id", amount: 40000, providerProposalId: null
    });
    expect(await b.findPreparationHold(planId, userId)).toMatchObject({ state: "RESERVED" });
  });

  it("does not resurrect a submission after simulated worker exit or a crashed provider request", async () => {
    const folder = mkdtempSync(join(tmpdir(), "moniflow-recovery-"));
    folders.push(folder);
    const url = "file:" + join(folder, "hold.sqlite");
    const first = new SqliteExecutionRepository(url);
    expect(await first.claimPreparation(input)).toBe(true);
    await first.close();
    const restarted = new SqliteExecutionRepository(url);
    openRepositories.push(restarted);
    expect(await restarted.claimPreparation(input)).toBe(false);
    expect(await restarted.findPreparationHold(planId, userId)).toMatchObject({ state: "RESERVED" });
    await restarted.recordPreparationOutcome(planId, userId, "PROVIDER_OUTCOME_UNKNOWN");
    expect(await restarted.claimPreparation(input)).toBe(false);
    expect(await restarted.findPreparationHold(planId, userId)).toMatchObject({
      state: "PROVIDER_OUTCOME_UNKNOWN", providerProposalId: null
    });
  });

  it("keeps owner isolation and never allows a new reservation to overwrite an old plan", async () => {
    const db = new SqliteExecutionRepository(":memory:");
    openRepositories.push(db);
    expect(await db.claimPreparation(input)).toBe(true);
    expect(await db.findPreparationHold(planId, otherUserId)).toBeNull();
    expect(await db.claimPreparation({ ...input, localUserId: otherUserId })).toBe(false);
    expect(await db.claimPreparation({
      ...input, approvedPlanHash: "1".repeat(64), providerBankAccountId: "other-destination", amount: 100
    })).toBe(false);
    await db.recordPreparationOutcome(planId, otherUserId, "PROPOSAL_RECORDED", "wrong");
    expect(await db.findPreparationHold(planId, userId)).toMatchObject({
      approvedPlanHash: hash, providerBankAccountId: "verified-bank-id",
      state: "RESERVED", providerProposalId: null
    });
  });

  it("records accepted provider id but never reopens a claimed plan or overwrites its outcome", async () => {
    const db = new SqliteExecutionRepository(":memory:");
    openRepositories.push(db);
    await db.claimPreparation(input);
    await db.recordPreparationOutcome(planId, userId, "PROPOSAL_RECORDED", "proposal-xyz");
    await db.recordPreparationOutcome(planId, userId, "PROVIDER_OUTCOME_UNKNOWN");
    expect(await db.findPreparationHold(planId, userId)).toMatchObject({
      state: "PROPOSAL_RECORDED", providerProposalId: "proposal-xyz"
    });
    expect(await db.claimPreparation(input)).toBe(false);
  });

  it("distinct plans receive independent durable holds", async () => {
    const db = new SqliteExecutionRepository(":memory:");
    openRepositories.push(db);
    expect(await db.claimPreparation(input)).toBe(true);
    expect(await db.claimPreparation({ ...input, planId: "44444444-4444-4444-8444-444444444444" })).toBe(true);
  });
});
