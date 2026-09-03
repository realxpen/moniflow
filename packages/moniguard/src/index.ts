import { z } from "zod";

export const guardVerdictSchema = z.enum(["ALLOW", "REVIEW", "BLOCK"]);

export type GuardVerdict = z.infer<typeof guardVerdictSchema>;

export const guardCheckSchema = z.object({
  rule: z.string().min(1),
  passed: z.boolean(),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string().min(1)
});

export type GuardCheck = z.infer<typeof guardCheckSchema>;
