import { describe, expect, it } from "vitest";

import { SqliteBankAccountRepository } from "../../repositories/sqlite-bank-account.js";
import { buildMoneyPlan } from "./engine.js";
import { fingerprintMoneyPlan } from "./approval.js";
import { bindVerifiedPlanDestinations, getReviewedDestination } from "./beneficiary-binding.js";

const user = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const bankData = {
  id: "33333333-3333-4333-8333-333333333333",
  localUserId: user,
  label: "GTBank",
  providerAccountId: "verified-account-1",
  bankCode: "058",
  bankName: "GTBank",
  maskedAccountNumber: "•••• 1234",
  accountHolderName: "EXAMPLE HOLDER",
  verified: true as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

function plan() {
  return buildMoneyPlan({
    intent: "MULTI_ACTION",
    requiresApproval: true,
    actions: [
      { intent: "BANK_WITHDRAWAL", currency: "NGN", amount: 40000, destination: { kind: "SAVED_BANK", label: "GTBank" }, requiresApproval: true },
      { intent: "ALLOCATE_POCKET", currency: "NGN", amount: 20000, pocket: { name: "Laptop" }, requiresApproval: false }
    ]
  }, 300000);
}

describe("Owner-bound bank account sealing", () => {
  it("seals exact bank identity before storing a plan, then includes all fields in approval digest", async () => {
    const banks = new SqliteBankAccountRepository(":memory:");
    try {
      await banks.saveVerified(bankData);
      const base = plan();
      const bound = await bindVerifiedPlanDestinations(base, user, banks);
      const withdrawal = bound.actions[0]!;
      if (withdrawal.kind !== "BANK_WITHDRAWAL") throw new Error("No withdrawal");
      expect(withdrawal.destinationBinding).toEqual({
        providerAccountId: "verified-account-1", bankCode: "058",
        bankName: "GTBank", maskedAccountNumber: "•••• 1234",
        accountHolderName: "EXAMPLE HOLDER"
      });
      expect(fingerprintMoneyPlan(bound)).not.toBe(fingerprintMoneyPlan(base));
      expect(fingerprintMoneyPlan(structuredClone(bound))).toBe(fingerprintMoneyPlan(bound));
      expect((await getReviewedDestination(withdrawal, user, banks))?.providerAccountId)
        .toBe("verified-account-1");

      for (const changes of [
        { providerAccountId: "verified-account-2" }, { bankCode: "044" },
        { bankName: "Different Bank" }, { maskedAccountNumber: "•••• 9999" },
        { accountHolderName: "OTHER HOLDER" }
      ]) {
        const changed = structuredClone(bound);
        const action = changed.actions[0]!;
        if (action.kind !== "BANK_WITHDRAWAL") throw new Error("No withdrawal");
        action.destinationBinding = { ...action.destinationBinding!, ...changes };
        expect(fingerprintMoneyPlan(changed)).not.toBe(fingerprintMoneyPlan(bound));
        expect(await getReviewedDestination(action, user, banks)).toBeNull();
      }
    } finally { await banks.close(); }
  });

  it("never fills a missing legacy snapshot after a plan has been stored", async () => {
    const banks = new SqliteBankAccountRepository(":memory:");
    try {
      await banks.saveVerified(bankData);
      const legacy = plan();
      const action = legacy.actions[0]!;
      if (action.kind !== "BANK_WITHDRAWAL") throw new Error("No withdrawal");
      expect(action.destinationBinding).toBeUndefined();
      expect(await getReviewedDestination(action, user, banks)).toBeNull();
    } finally { await banks.close(); }
  });

  it("never seals a foreign user's bank account or an unregistered label", async () => {
    const banks = new SqliteBankAccountRepository(":memory:");
    try {
      await banks.saveVerified({ ...bankData, localUserId: other });
      const own = await bindVerifiedPlanDestinations(plan(), user, banks);
      const action = own.actions[0]!;
      if (action.kind !== "BANK_WITHDRAWAL") throw new Error("No withdrawal");
      expect(action.destinationBinding).toBeUndefined();
      expect(await getReviewedDestination(action, user, banks)).toBeNull();
    } finally { await banks.close(); }
  });
});
