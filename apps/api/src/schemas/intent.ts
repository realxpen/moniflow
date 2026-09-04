import { z } from "zod";

const ngnCurrencySchema = z.literal("NGN");
const moneyAmountSchema = z.number().positive().finite();

export const savedBankDestinationSchema = z.object({
  kind: z.literal("SAVED_BANK"),
  label: z.string().trim().min(1)
}).strict();

export const checkBalanceIntentSchema = z.object({
  intent: z.literal("CHECK_BALANCE"),
  currency: ngnCurrencySchema,
  requiresApproval: z.literal(false)
}).strict();

export const bankWithdrawalIntentSchema = z.object({
  intent: z.literal("BANK_WITHDRAWAL"),
  currency: ngnCurrencySchema,
  amount: moneyAmountSchema,
  destination: savedBankDestinationSchema,
  requiresApproval: z.literal(true)
}).strict();

export const createPocketIntentSchema = z.object({
  intent: z.literal("CREATE_POCKET"),
  pocket: z.object({ name: z.string().trim().min(1).max(48) }).strict(),
  requiresApproval: z.literal(false)
}).strict();

export const allocatePocketIntentSchema = z.object({
  intent: z.literal("ALLOCATE_POCKET"),
  currency: ngnCurrencySchema,
  amount: moneyAmountSchema,
  pocket: z.object({ name: z.string().trim().min(1).max(48) }).strict(),
  requiresApproval: z.literal(false)
}).strict();

export const showActivityIntentSchema = z.object({
  intent: z.literal("SHOW_ACTIVITY"),
  requiresApproval: z.literal(false)
}).strict();

export const atomicIntentSchema = z.discriminatedUnion("intent", [
  checkBalanceIntentSchema,
  bankWithdrawalIntentSchema,
  createPocketIntentSchema,
  allocatePocketIntentSchema,
  showActivityIntentSchema
]);

export const multiActionIntentSchema = z.object({
  intent: z.literal("MULTI_ACTION"),
  actions: z.array(atomicIntentSchema).min(2).max(5),
  requiresApproval: z.boolean()
}).strict();

export const unsupportedIntentSchema = z.object({
  intent: z.literal("UNSUPPORTED"),
  requiresApproval: z.literal(false),
  reason: z.enum(["EMPTY", "AMBIGUOUS", "UNSUPPORTED_ACTION", "INCOMPLETE_ACTION"])
}).strict();

export const moniflowIntentSchema = z.union([
  atomicIntentSchema,
  multiActionIntentSchema,
  unsupportedIntentSchema
]);

export type AtomicIntent = z.infer<typeof atomicIntentSchema>;
export type MoniflowIntent = z.infer<typeof moniflowIntentSchema>;
