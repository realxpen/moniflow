import { describe, expect, it } from "vitest";

import type { PreparationHold, ProviderExecution } from "../../repositories/execution.js";
import type { PersistedMoneyPlan } from "../../repositories/money-plan.js";
import { buildMoneyPlan } from "./engine.js";
import { fingerprintMoneyPlan } from "./approval.js";
import { classifyLocalFinancialRecovery } from "./financial-recovery.js";

const user = "11111111-1111-4111-8111-111111111111";
const planId = "33333333-3333-4333-8333-333333333333";
const when = "2026-10-21T10:20:00.000Z";
const intent = {
  intent: "BANK_WITHDRAWAL" as const, currency: "NGN" as const,
  amount: 40000, destination: { kind: "SAVED_BANK" as const, label: "GTBank" },
  requiresApproval: true as const
};

function records() {
  const plan = buildMoneyPlan(intent, 300000);
  const withdrawal = plan.actions[0]!;
  if (withdrawal.kind !== "BANK_WITHDRAWAL") throw Error("fixture missing bank action");
  withdrawal.destinationBinding = {
    providerAccountId: "private-bank-123", bankCode: "058", bankName: "GTBank",
    maskedAccountNumber: "•••• 1234", accountHolderName: "PRIVATE NAME"
  };
  const planHash = fingerprintMoneyPlan(plan);
  const moneyPlan: PersistedMoneyPlan = {
    id: planId, localUserId: user, originalInstruction: "private instruction",
    intent, plan, planHash, approvedPlanHash: planHash, approvedAt: when,
    status: "APPROVED", guardVerdict: "REVIEW", createdAt: when, updatedAt: when
  };
  const hold: PreparationHold = {
    planId, localUserId: user, approvedPlanHash: planHash,
    providerBankAccountId: "private-bank-123", amount: 40000, reservedAmount: 40000,
    state: "PROPOSAL_RECORDED", providerProposalId: "proposal-private-123",
    createdAt: when, updatedAt: when
  };
  const execution: ProviderExecution = {
    planId, localUserId: user, providerProposalId: "proposal-private-123",
    providerBankAccountId: "private-bank-123", amount: 40000, currency: "NGN",
    state: "PROCESSING", signHash: "secret-signing-hash",
    providerStatus: "PROCESSING", createdAt: when, updatedAt: when
  };
  return { moneyPlan, hold, execution };
}

describe("Local-only financial reconciliation classification", () => {
  it("does not equate a stored provider proposal with settled money", () => {
    const { hold, moneyPlan, execution } = records();
    const value = classifyLocalFinancialRecovery(hold, moneyPlan, execution);
    expect(value).toEqual({
      planId, state: "LOCAL_PROPOSAL_RECORDED", recordedAt: when,
      manualReviewRequired: true, automaticRetryAllowed: false, automaticReleaseAllowed: false
    });
    expect(JSON.stringify(value)).not.toMatch(/private-bank|proposal-private|40000|secret|GTBank|PRIVATE NAME/i);
  });

  it("distinguishes local completion from independently verified provider evidence", () => {
    const { hold, moneyPlan, execution } = records();
    const result = classifyLocalFinancialRecovery(hold, moneyPlan, { ...execution, state: "COMPLETED" });
    expect(result.state).toBe("LOCAL_COMPLETION_RECORDED");
    expect(result.manualReviewRequired).toBe(true);
    expect(result.automaticReleaseAllowed).toBe(false);
  });

  it("keeps unknown outcomes and never treats a reservation as proof a provider was called", () => {
    const { hold, moneyPlan } = records();
    expect(classifyLocalFinancialRecovery({
      ...hold, state: "RESERVED", providerProposalId: null
    }, moneyPlan, null).state).toBe("PREPARATION_UNCONFIRMED");
    expect(classifyLocalFinancialRecovery({
      ...hold, state: "PROVIDER_OUTCOME_UNKNOWN", providerProposalId: null
    }, moneyPlan, null).state).toBe("PROVIDER_OUTCOME_UNKNOWN");
  });

  it("never guesses the reserved commitment on pre-Phase36 legacy holds", () => {
    const { hold, moneyPlan, execution } = records();
    const result = classifyLocalFinancialRecovery({ ...hold, reservedAmount: null }, moneyPlan, execution);
    expect(result.state).toBe("LEGACY_UNKNOWN_COMMITMENT");
    expect(result.automaticReleaseAllowed).toBe(false);
  });

  it("detects changed plan hash, destination, amount, missing proposal, or foreign owner", () => {
    const { hold, moneyPlan, execution } = records();
    const cases = [
      { hold, plan: null, execution },
      { hold, plan: { ...moneyPlan, approvedPlanHash: "a".repeat(64) }, execution },
      { hold, plan: { ...moneyPlan, localUserId: "22222222-2222-4222-8222-222222222222" }, execution },
      { hold: { ...hold, providerBankAccountId: "changed-provider" }, plan: moneyPlan, execution },
      { hold: { ...hold, reservedAmount: 39999 }, plan: moneyPlan, execution },
      { hold, plan: moneyPlan, execution: { ...execution, amount: 41000 } },
      { hold, plan: moneyPlan, execution: { ...execution, providerProposalId: "different" } },
      { hold, plan: moneyPlan, execution: null }
    ];
    for (const value of cases) {
      const review = classifyLocalFinancialRecovery(value.hold, value.plan, value.execution);
      expect(review.state).toBe("LOCAL_RECORD_MISMATCH");
      expect(review.automaticRetryAllowed).toBe(false);
      expect(review.automaticReleaseAllowed).toBe(false);
    }
  });
});
