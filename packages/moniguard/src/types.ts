export type GuardVerdict = "ALLOW" | "REVIEW" | "BLOCK";

export type GuardRuleName =
  | "SUPPORTED_INTENT"
  | "POSITIVE_AMOUNT"
  | "CURRENCY"
  | "BALANCE"
  | "DESTINATION"
  | "AMOUNT_INTEGRITY"
  | "PLAN_INTEGRITY"
  | "HUMAN_APPROVAL";

export type GuardSeverity = "info" | "warning" | "critical";

export type GuardCheck = {
  rule: GuardRuleName;
  passed: boolean;
  severity: GuardSeverity;
  message: string;
};

export type GuardAtomicIntent =
  | { intent: "CHECK_BALANCE"; currency: "NGN"; requiresApproval: false }
  | {
      intent: "BANK_WITHDRAWAL";
      currency: "NGN";
      amount: number;
      destination: { kind: "SAVED_BANK"; label: string };
      requiresApproval: true;
    }
  | { intent: "CREATE_POCKET"; pocket: { name: string }; requiresApproval: false }
  | {
      intent: "ALLOCATE_POCKET";
      currency: "NGN";
      amount: number;
      pocket: { name: string };
      requiresApproval: false;
    }
  | { intent: "SHOW_ACTIVITY"; requiresApproval: false };

export type GuardIntent =
  | GuardAtomicIntent
  | { intent: "MULTI_ACTION"; actions: GuardAtomicIntent[]; requiresApproval: boolean }
  | { intent: "UNSUPPORTED"; requiresApproval: false; reason: string };

export type GuardPlanAction = {
  index: number;
  kind: "BANK_WITHDRAWAL" | "ALLOCATE_POCKET" | "CREATE_POCKET" | "CHECK_BALANCE" | "SHOW_ACTIVITY";
  label: string;
  description: string;
  amount: number;
  movement: "EXTERNAL" | "INTERNAL" | "NONE";
  requiresApproval: boolean;
};

export type GuardMoneyPlan = {
  currency: "NGN" | string;
  currentAvailable: number;
  actions: GuardPlanAction[];
  totals: {
    externalMovement: number;
    internalAllocation: number;
    totalCommitted: number;
    availableAfter: number;
  };
  requiresApproval: boolean;
  sourceIntent: string;
};

export type GuardContext = {
  intent: GuardIntent;
  plan: GuardMoneyPlan;
};

export type GuardResult = {
  verdict: GuardVerdict;
  checks: GuardCheck[];
};

export type GuardRule = (context: GuardContext) => GuardCheck;

export function atomicIntents(intent: GuardIntent): GuardAtomicIntent[] {
  if (intent.intent === "MULTI_ACTION") return intent.actions;
  if (intent.intent === "UNSUPPORTED") return [];
  return [intent];
}
