import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../create-app.js";
import { SqliteBankAccountRepository } from "../repositories/sqlite-bank-account.js";
import { SqliteMoneyPlanRepository } from "../repositories/sqlite-money-plan.js";
import type { BmoniGateway } from "../services/bmoni/index.js";
import type { BmoniUserService } from "../services/bmoni/user-service.js";
import { fingerprintMoneyPlan } from "../services/plans/approval.js";
import { buildMoneyPlan } from "../services/plans/engine.js";

const localUserId = "11111111-1111-4111-8111-111111111111";
const apps: Array<ReturnType<typeof buildApp>> = [];
const bankStores: SqliteBankAccountRepository[] = [];
const planStores: SqliteMoneyPlanRepository[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  await Promise.all([...bankStores.splice(0), ...planStores.splice(0)].map((repo) => repo.close()));
});

function setup() {
  const plans = new SqliteMoneyPlanRepository(":memory:");
  const banks = new SqliteBankAccountRepository(":memory:");
  planStores.push(plans);
  bankStores.push(banks);
  const app = buildApp({
    getBmoniGateway: () => ({} as BmoniGateway),
    getBmoniUserService: () => ({} as BmoniUserService),
    getMoneyPlanRepository: () => plans,
    getBankAccountRepository: () => banks
  });
  apps.push(app);
  return { app, plans, banks };
}

const money = (label: string, amount: number) => ({
  intent: "BANK_WITHDRAWAL" as const,
  currency: "NGN" as const,
  amount,
  destination: { kind: "SAVED_BANK" as const, label },
  requiresApproval: true as const
});

async function createPlan(plans: SqliteMoneyPlanRepository, multi = true) {
  const intent = multi
    ? { intent: "MULTI_ACTION" as const, actions: [money("GTBank", 40000), money("Access Bank", 10000)], requiresApproval: true }
    : money("GTBank", 40000);
  const plan = buildMoneyPlan(intent, 300000);
  const record = await plans.create({
    localUserId,
    originalInstruction: "Isolated test fixture; no real transaction",
    intent,
    plan,
    planHash: fingerprintMoneyPlan(plan)
  });
  return record;
}

async function saveBank(banks: SqliteBankAccountRepository, label: string) {
  const now = new Date().toISOString();
  return banks.saveVerified({
    id: label === "GTBank" ? "33333333-3333-4333-8333-333333333333" : "44444444-4444-4444-8444-444444444444",
    localUserId,
    label,
    providerAccountId: label === "GTBank" ? "fixture-gtbank" : "fixture-access",
    bankCode: label === "GTBank" ? "058" : "044",
    bankName: label,
    maskedAccountNumber: "•••• 0000",
    accountHolderName: "TEST FIXTURE",
    verified: true,
    createdAt: now,
    updatedAt: now
  });
}

describe("Multi-withdrawal authorization boundaries", () => {
  it("does not mark all destinations verified when only the first beneficiary is verified", async () => {
    const { app, plans, banks } = setup();
    const record = await createPlan(plans);
    await saveBank(banks, "GTBank");
    const response = await app.inject({
      method: "POST", url: `/api/operator/plans/${record.id}/guard`, payload: { localUserId }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ verdict: "BLOCK", status: "BLOCKED" });
    expect(response.json().checks.find((check: { rule: string }) => check.rule === "DESTINATION"))
      .toMatchObject({ passed: false, severity: "critical" });
  });

  it("rejects two separately verified beneficiaries because device execution supports exactly one withdrawal", async () => {
    const { app, plans, banks } = setup();
    const record = await createPlan(plans);
    await saveBank(banks, "GTBank");
    await saveBank(banks, "Access Bank");
    const response = await app.inject({
      method: "POST", url: `/api/operator/plans/${record.id}/guard`, payload: { localUserId }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().verdict).toBe("BLOCK");
    expect(response.json().checks.find((check: { rule: string }) => check.rule === "DESTINATION")?.message)
      .toMatch(/multiple bank withdrawals/);
  });

  it("does not give a multi-withdrawal plan a human-authorization preview or approval", async () => {
    const { app, plans, banks } = setup();
    const record = await createPlan(plans);
    await saveBank(banks, "GTBank");
    await saveBank(banks, "Access Bank");
    // Force a simulated legacy review state. Current guard would block it;
    // a previously stored record must also be refused.
    await plans.recordGuard(record.id, localUserId, "REVIEW", [], record.planHash);

    const preview = await app.inject({
      method: "GET",
      url: `/api/operator/plans/${record.id}/authorization?localUserId=${localUserId}`
    });
    expect(preview.statusCode).toBe(409);
    expect(preview.json().message).toMatch(/exactly one/);

    const approve = await app.inject({
      method: "POST", url: `/api/operator/plans/${record.id}/approve`,
      payload: { localUserId, expectedPlanHash: record.planHash }
    });
    expect(approve.statusCode).toBe(409);
    expect(approve.json().message).toMatch(/Multiple bank withdrawals/);
    const stored = await plans.findById(record.id, localUserId);
    expect(stored?.status).not.toBe("APPROVED");
  });

  it("refuses execution-readiness on a legacy approved multi-withdrawal plan", async () => {
    const { app, plans, banks } = setup();
    const record = await createPlan(plans);
    await saveBank(banks, "GTBank");
    await saveBank(banks, "Access Bank");
    await plans.recordGuard(record.id, localUserId, "REVIEW", [], record.planHash);
    await plans.approve(record.id, localUserId, record.planHash);
    const response = await app.inject({
      method: "GET",
      url: `/api/operator/plans/${record.id}/execution-readiness?localUserId=${localUserId}`
    });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      canExecute: false,
      error: "UNSUPPORTED_WITHDRAWAL_COUNT"
    });
  });

  it("keeps a single verified withdrawal eligible for guard review and authorization", async () => {
    const { app, plans, banks } = setup();
    const record = await createPlan(plans, false);
    await saveBank(banks, "GTBank");
    const guard = await app.inject({
      method: "POST", url: `/api/operator/plans/${record.id}/guard`,
      payload: { localUserId }
    });
    expect(guard.statusCode).toBe(200);
    expect(guard.json().verdict).toBe("REVIEW");
    expect(guard.json().checks.find((check: { rule: string }) => check.rule === "DESTINATION")?.passed)
      .toBe(true);
    const preview = await app.inject({
      method: "GET", url: `/api/operator/plans/${record.id}/authorization?localUserId=${localUserId}`
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().authorization).toMatchObject({ amount: 40000, destination: { bankName: "GTBank" } });
  });

  it("continues to block a single withdrawal when its destination is unverified", async () => {
    const { app, plans } = setup();
    const record = await createPlan(plans, false);
    const response = await app.inject({
      method: "POST", url: `/api/operator/plans/${record.id}/guard`, payload: { localUserId }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().verdict).toBe("BLOCK");
    expect(response.json().checks.find((check: { rule: string }) => check.rule === "DESTINATION")?.passed)
      .toBe(false);
  });
});
