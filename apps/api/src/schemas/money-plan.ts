import { z } from "zod";

const moneySchema = z.number().finite();
const nonnegativeMoneySchema = z.number().nonnegative().finite();

export const moneyPlanActionSchema = z.discriminatedUnion("kind", [
  z.object({
    index: z.number().int().positive(),
    kind: z.literal("BANK_WITHDRAWAL"),
    label: z.string().trim().min(1),
    description: z.literal("Withdrawal"),
    amount: z.number().positive().finite(),
    movement: z.literal("EXTERNAL"),
    requiresApproval: z.literal(true)
  }).strict(),
  z.object({
    index: z.number().int().positive(),
    kind: z.literal("ALLOCATE_POCKET"),
    label: z.string().trim().min(1),
    description: z.literal("Allocation"),
    amount: z.number().positive().finite(),
    movement: z.literal("INTERNAL"),
    requiresApproval: z.literal(false)
  }).strict(),
  z.object({
    index: z.number().int().positive(),
    kind: z.literal("CREATE_POCKET"),
    label: z.string().trim().min(1),
    description: z.literal("Create pocket"),
    amount: z.literal(0),
    movement: z.literal("NONE"),
    requiresApproval: z.literal(false)
  }).strict(),
  z.object({
    index: z.number().int().positive(),
    kind: z.literal("CHECK_BALANCE"),
    label: z.literal("Available balance"),
    description: z.literal("Balance check"),
    amount: z.literal(0),
    movement: z.literal("NONE"),
    requiresApproval: z.literal(false)
  }).strict(),
  z.object({
    index: z.number().int().positive(),
    kind: z.literal("SHOW_ACTIVITY"),
    label: z.literal("Recent activity"),
    description: z.literal("Activity view"),
    amount: z.literal(0),
    movement: z.literal("NONE"),
    requiresApproval: z.literal(false)
  }).strict()
]);

export const moneyPlanSchema = z.object({
  currency: z.literal("NGN"),
  currentAvailable: nonnegativeMoneySchema,
  actions: z.array(moneyPlanActionSchema).min(1).max(5),
  totals: z.object({
    externalMovement: nonnegativeMoneySchema,
    internalAllocation: nonnegativeMoneySchema,
    totalCommitted: nonnegativeMoneySchema,
    availableAfter: moneySchema
  }).strict(),
  requiresApproval: z.boolean(),
  sourceIntent: z.enum([
    "CHECK_BALANCE",
    "BANK_WITHDRAWAL",
    "CREATE_POCKET",
    "ALLOCATE_POCKET",
    "SHOW_ACTIVITY",
    "MULTI_ACTION"
  ])
}).strict();

export type MoneyPlan = z.infer<typeof moneyPlanSchema>;
export type MoneyPlanAction = z.infer<typeof moneyPlanActionSchema>;
