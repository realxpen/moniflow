import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPostgresClient, ensureMoniflowSchema, PostgresMoneyPlanRepository } from "./postgres.js";
import { ensureExecutionSchema, PostgresExecutionRepository } from "./postgres-execution.js";
import { buildMoneyPlan } from "../services/plans/engine.js";
import { fingerprintMoneyPlan } from "../services/plans/approval.js";

// Only the disposable localhost database explicitly provisioned in GitHub CI.
// Never connect to a live remote BMONI or production user database.
const url = process.env.MONIFLOW_TEST_POSTGRES_URL;
const safe = (() => {
  if (!url || process.env.NODE_ENV !== "test" ||
      process.env.MONIFLOW_B2_DISPOSABLE_DB_TESTS !== "true") return false;
  try {
    const candidate = new URL(url);
    return ["postgres:", "postgresql:"].includes(candidate.protocol) &&
      ["127.0.0.1", "localhost"].includes(candidate.hostname) &&
      candidate.pathname === "/moniflow_b2_ci";
  } catch { return false; }
})();
const suite = safe ? describe : describe.skip;

suite("Disposable PostgreSQL cross-instance financial preparation fence", () => {
  if (!url || !safe) return;
  const primarySql = createPostgresClient(url);
  const secondarySql = createPostgresClient(url);
  const first = new PostgresExecutionRepository(primarySql);
  const second = new PostgresExecutionRepository(secondarySql);
  const plans = new PostgresMoneyPlanRepository(primarySql);
  const userId = randomUUID();
  const foreignUserId = randomUUID();

  beforeAll(async () => {
    await ensureMoniflowSchema(primarySql);
    await ensureExecutionSchema(primarySql);
    await primarySql`
      insert into moniflow_private.bmoni_user_mappings(local_user_id, email, bmoni_user_id)
      values (${userId}::uuid, ${"holds-" + userId + "@example.invalid"}, ${"fixture-" + userId})
    `;
  });

  afterAll(async () => {
    await primarySql`
      delete from moniflow_private.bmoni_user_mappings where local_user_id = ${userId}::uuid
    `;
    await Promise.all([primarySql.end({ timeout: 5 }), secondarySql.end({ timeout: 5 })]);
  });

  async function newPlan(ownerId = userId) {
    const intent = {
      intent: "BANK_WITHDRAWAL" as const,
      currency: "NGN" as const,
      amount: 40000,
      destination: { kind: "SAVED_BANK" as const, label: "GTBank" },
      requiresApproval: true as const
    };
    const plan = buildMoneyPlan(intent, 300000);
    const hash = fingerprintMoneyPlan(plan);
    const record = await plans.create({ localUserId: ownerId, intent, plan, planHash: hash, originalInstruction: "Disposable financial hold fixture" });
    return {
      planId: record.id, localUserId: ownerId, approvedPlanHash: hash,
      providerBankAccountId: "disposable-bank-fixture", amount: 40000
    };
  }

  it("round-trips real JSONB intent/plan payloads and still reads prior string-wrapped PostgreSQL rows", async () => {
    const data = await newPlan();
    const rows = await primarySql`
      select jsonb_typeof(intent_payload) as intent_type, jsonb_typeof(plan_payload) as plan_type
      from moniflow_private.money_plans where id = ${data.planId}::uuid
    `;
    expect(rows[0]).toMatchObject({ intent_type: "object", plan_type: "object" });
    const current = await plans.findById(data.planId, userId);
    expect(current?.intent.intent).toBe("BANK_WITHDRAWAL");
    expect(current?.plan.actions[0]?.kind).toBe("BANK_WITHDRAWAL");

    // The legacy writer encoded some JSON documents as JSON string scalars.
    await primarySql`
      update moniflow_private.money_plans
      set intent_payload = to_jsonb(intent_payload::text),
          plan_payload = to_jsonb(plan_payload::text)
      where id = ${data.planId}::uuid
    `;
    const wrapped = await plans.findById(data.planId, userId);
    expect(wrapped?.intent.intent).toBe("BANK_WITHDRAWAL");
    expect(wrapped?.plan.actions[0]?.kind).toBe("BANK_WITHDRAWAL");
  });

  it("only one API instance can acquire the provider reservation for the same plan", async () => {
    const data = await newPlan();
    const claimed = await Promise.all([
      first.claimPreparation(data),
      second.claimPreparation(data)
    ]);
    expect(claimed.filter(Boolean)).toHaveLength(1);
    expect(await first.findPreparationHold(data.planId, userId)).toMatchObject({
      planId: data.planId, state: "RESERVED", amount: 40000,
      approvedPlanHash: data.approvedPlanHash
    });
    expect(await second.claimPreparation(data)).toBe(false);
  });

  it("unknown provider outcomes are sticky after worker changes and cannot reissue proposals", async () => {
    const data = await newPlan();
    expect(await first.claimPreparation(data)).toBe(true);
    await second.recordPreparationOutcome(data.planId, userId, "PROVIDER_OUTCOME_UNKNOWN");
    expect(await first.findPreparationHold(data.planId, userId)).toMatchObject({
      state: "PROVIDER_OUTCOME_UNKNOWN", providerProposalId: null
    });
    expect(await first.claimPreparation(data)).toBe(false);
    expect(await second.claimPreparation(data)).toBe(false);
    expect(await second.findPreparationHold(data.planId, foreignUserId)).toBeNull();
  });

  it("serializes distinct-plan reservations across two PostgreSQL clients without overspending", async () => {
    const owner = randomUUID();
    await primarySql`
      insert into moniflow_private.bmoni_user_mappings(local_user_id, email, bmoni_user_id)
      values (${owner}::uuid, ${"spend-" + owner + "@example.invalid"}, ${"spend-" + owner})
    `;
    try {
      const a = await newPlan(owner);
      const b = await newPlan(owner);
      const claim = (value: typeof a, amount: number) => ({
        ...value, amount: 40000, reservedAmount: amount, spendableCeiling: 100000
      });
      const results = await Promise.all([
        first.claimSpendablePreparation(claim(a, 70000)),
        second.claimSpendablePreparation(claim(b, 60000))
      ]);
      expect(results).toContain("CLAIMED");
      expect(results).toContain("INSUFFICIENT_CAPACITY");
      const winner = results[0] === "CLAIMED" ? a : b;
      const loser = results[0] === "CLAIMED" ? b : a;
      expect((await first.findPreparationHold(winner.planId, owner))?.state).toBe("RESERVED");
      expect(await first.findPreparationHold(loser.planId, owner)).toBeNull();
      await first.recordPreparationOutcome(winner.planId, owner, "PROVIDER_OUTCOME_UNKNOWN");
      expect(await second.claimSpendablePreparation(claim(loser, 60000)))
        .toBe("INSUFFICIENT_CAPACITY");
    } finally {
      await primarySql`delete from moniflow_private.bmoni_user_mappings where local_user_id = ${owner}::uuid`;
    }
  });

  it("requires reconciliation of legacy unknown-budget holds before allocating other plans", async () => {
    const owner = randomUUID();
    await primarySql`
      insert into moniflow_private.bmoni_user_mappings(local_user_id, email, bmoni_user_id)
      values (${owner}::uuid, ${"old-" + owner + "@example.invalid"}, ${"old-" + owner})
    `;
    try {
      const old = await newPlan(owner);
      const newer = await newPlan(owner);
      expect(await first.claimPreparation(old)).toBe(true);
      expect(await second.claimSpendablePreparation({
        ...newer, reservedAmount: 40000, spendableCeiling: 300000
      })).toBe("UNRECONCILED_LEGACY");
      expect(await first.findPreparationHold(newer.planId, owner)).toBeNull();
    } finally {
      await primarySql`delete from moniflow_private.bmoni_user_mappings where local_user_id = ${owner}::uuid`;
    }
  });

  it("records a confirmed proposal for observation but never releases the plan claim", async () => {
    const data = await newPlan();
    expect(await second.claimPreparation(data)).toBe(true);
    await first.recordPreparationOutcome(data.planId, userId, "PROPOSAL_RECORDED", "disposable-proposal-1");
    await second.recordPreparationOutcome(data.planId, foreignUserId, "PROVIDER_OUTCOME_UNKNOWN");
    expect(await first.findPreparationHold(data.planId, userId)).toMatchObject({
      state: "PROPOSAL_RECORDED", providerProposalId: "disposable-proposal-1"
    });
    expect(await second.claimPreparation(data)).toBe(false);
  });
});
