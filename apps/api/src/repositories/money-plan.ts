import type { GuardCheck } from "@moniflow/moniguard";

import type { MoniflowIntent } from "../schemas/intent.js";
import type { MoneyPlan } from "../schemas/money-plan.js";

export type MoneyPlanStatus =
  | "VALIDATING"
  | "BLOCKED"
  | "AWAITING_USER_APPROVAL"
  | "APPROVED"
  | "EXECUTING"
  | "AWAITING_DEVICE_SIGNATURE"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type PersistedMoneyPlan = {
  id: string;
  localUserId: string;
  originalInstruction: string;
  status: MoneyPlanStatus;
  intent: MoniflowIntent;
  plan: MoneyPlan;
  guardVerdict: "ALLOW" | "REVIEW" | "BLOCK" | null;
  planHash: string;
  approvedPlanHash: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePersistedMoneyPlanInput = {
  localUserId: string;
  originalInstruction: string;
  intent: MoniflowIntent;
  plan: MoneyPlan;
  planHash: string;
};

export interface MoneyPlanRepository {
  create(input: CreatePersistedMoneyPlanInput): Promise<PersistedMoneyPlan>;
  findById(planId: string, localUserId: string): Promise<PersistedMoneyPlan | null>;
  recordGuard(
    planId: string,
    localUserId: string,
    verdict: "ALLOW" | "REVIEW" | "BLOCK",
    checks: GuardCheck[],
    currentPlanHash: string
  ): Promise<PersistedMoneyPlan | null>;
  approve(planId: string, localUserId: string, approvedPlanHash: string): Promise<PersistedMoneyPlan | null>;
  invalidateApproval(planId: string, localUserId: string, currentPlanHash: string): Promise<PersistedMoneyPlan | null>;
  transitionExecutionStatus(
    planId: string,
    localUserId: string,
    from: MoneyPlanStatus[],
    to: "EXECUTING" | "AWAITING_DEVICE_SIGNATURE" | "PROCESSING" | "COMPLETED" | "FAILED"
  ): Promise<PersistedMoneyPlan | null>;
  close(): Promise<void>;
}
