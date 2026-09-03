import { z } from "zod";

export const supportedIntentSchema = z.enum([
  "CHECK_BALANCE",
  "BANK_WITHDRAWAL",
  "CREATE_POCKET",
  "ALLOCATE_POCKET",
  "SHOW_ACTIVITY",
  "MULTI_ACTION",
  "UNSUPPORTED"
]);

export type SupportedIntent = z.infer<typeof supportedIntentSchema>;
