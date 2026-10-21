import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../create-app.js";
import { SqliteBankAccountRepository } from "../repositories/sqlite-bank-account.js";
import { SqliteMoneyPlanRepository } from "../repositories/sqlite-money-plan.js";
import type { BmoniGateway } from "../services/bmoni/index.js";
import type { BmoniUserService } from "../services/bmoni/user-service.js";
import { bindVerifiedPlanDestinations } from "../services/plans/beneficiary-binding.js";
import { fingerprintMoneyPlan } from "../services/plans/approval.js";
import { buildMoneyPlan } from "../services/plans/engine.js";

const localUserId = "11111111-1111-4111-8111-111111111111";
const apps: Array<ReturnType<typeof buildApp>> = [];
const stores: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map(app => app.close()));
  await Promise.all(stores.splice(0).map(store => store.close()));
});

async function setup(binding: "sealed" | "legacy" | "mismatched" = "sealed") {
  const banks = new SqliteBankAccountRepository(":memory:");
  const plans = new SqliteMoneyPlanRepository(":memory:");
  stores.push(banks, plans);
  const now = new Date().toISOString();
  await banks.saveVerified({
    id: "33333333-3333-4333-8333-333333333333",
    localUserId, label: "GTBank", providerAccountId: "provider-gtb-001",
    bankCode: "058", bankName: "GTBank", maskedAccountNumber: "•••• 1234",
    accountHolderName: "TEST HOLDER", verified: true, createdAt: now, updatedAt: now
  });
  const intent = {
    intent: "BANK_WITHDRAWAL" as const, currency: "NGN" as const,
    amount: 40000, destination: { kind: "SAVED_BANK" as const, label: "GTBank" },
    requiresApproval: true as const
  };
  let plan = buildMoneyPlan(intent, 300000);
  if (binding !== "legacy") {
    plan = await bindVerifiedPlanDestinations(plan, localUserId, banks);
    if (binding === "mismatched") {
      const withdrawal = plan.actions[0]!;
      if (withdrawal.kind !== "BANK_WITHDRAWAL") throw Error("fixture withdrawal missing");
      withdrawal.destinationBinding = { ...withdrawal.destinationBinding!, providerAccountId: "attacker-account-id" };
    }
  }
  const stored = await plans.create({
    localUserId, intent, plan,
    originalInstruction: "Verified sandbox test only", planHash: fingerprintMoneyPlan(plan)
  });
  const app = buildApp({
    getBmoniGateway: () => ({} as BmoniGateway),
    getBmoniUserService: () => ({} as BmoniUserService),
    getBankAccountRepository: () => banks,
    getMoneyPlanRepository: () => plans
  });
  apps.push(app);
  return { app, banks, plans, stored };
}

describe("Bank beneficiary binding is required across the real server review lifecycle", () => {
  it("supports the full single-withdrawal review with its original sealed provider ID", async () => {
    const { app, stored } = await setup();
    const guard = await app.inject({
      method: "POST", url: `/api/operator/plans/${stored.id}/guard`,
      payload: { localUserId }
    });
    expect(guard.statusCode).toBe(200);
    expect(guard.json().verdict).toBe("REVIEW");
    const preview = await app.inject({
      method: "GET", url: `/api/operator/plans/${stored.id}/authorization?localUserId=${localUserId}`
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().authorization.destination.providerAccountId).toBe("provider-gtb-001");
    const approved = await app.inject({
      method: "POST", url: `/api/operator/plans/${stored.id}/approve`,
      payload: { localUserId, expectedPlanHash: stored.planHash }
    });
    expect(approved.statusCode).toBe(200);
    const readiness = await app.inject({
      method: "GET", url: `/api/operator/plans/${stored.id}/execution-readiness?localUserId=${localUserId}`
    });
    expect(readiness.statusCode).toBe(200);
    expect(readiness.json().canExecute).toBe(true);
  });

  it.each(["legacy", "mismatched"] as const)(
    "blocks %s bank identity records at Guard, preview, approval and readiness", async (variant) => {
      const { app, stored, plans } = await setup(variant);
      const guard = await app.inject({
        method: "POST", url: `/api/operator/plans/${stored.id}/guard`,
        payload: { localUserId }
      });
      expect(guard.statusCode).toBe(200);
      expect(guard.json().verdict).toBe("BLOCK");
      expect(guard.json().checks.find((c: { rule: string }) => c.rule === "DESTINATION")?.passed).toBe(false);
      // Simulate a legacy record previously marked REVIEW/APPROVED.
      await plans.recordGuard(stored.id, localUserId, "REVIEW", [], stored.planHash);
      const preview = await app.inject({
        method: "GET", url: `/api/operator/plans/${stored.id}/authorization?localUserId=${localUserId}`
      });
      expect(preview.statusCode).toBe(409);
      const approve = await app.inject({
        method: "POST", url: `/api/operator/plans/${stored.id}/approve`,
        payload: { localUserId, expectedPlanHash: stored.planHash }
      });
      expect(approve.statusCode).toBe(409);
      await plans.approve(stored.id, localUserId, stored.planHash);
      const readiness = await app.inject({
        method: "GET", url: `/api/operator/plans/${stored.id}/execution-readiness?localUserId=${localUserId}`
      });
      expect(readiness.statusCode).toBe(409);
      expect(readiness.json().canExecute).toBe(false);
    }
  );
});
