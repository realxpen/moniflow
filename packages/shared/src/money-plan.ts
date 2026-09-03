import { z } from "zod";

export const moneyPlanStatusSchema = z.enum([
  "DRAFT",
  "PARSING",
  "VALIDATING",
  "BLOCKED",
  "AWAITING_USER_APPROVAL",
  "APPROVED",
  "EXECUTING",
  "AWAITING_DEVICE_SIGNATURE",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);

export type MoneyPlanStatus = z.infer<typeof moneyPlanStatusSchema>;
