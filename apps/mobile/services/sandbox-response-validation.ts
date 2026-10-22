import { z } from "zod";

/**
 * The signed-in sandbox endpoint is not a BMONI balance API.
 * Reject malformed, contradictory or payment-success-shaped payloads before
 * any Figma dashboard can render them as example money.
 */
const amount = z.number().int().nonnegative().max(300_000);
const event = z.object({
  reference: z.string().min(1).max(200),
  kind: z.enum(["BANK_WITHDRAWAL", "POCKET_ALLOCATION"]),
  source: z.enum(["simulated_external", "simulated_internal"]),
  amount: amount.positive(),
  label: z.string().min(1).max(160),
  status: z.literal("SIMULATED")
});
const guardCheck = z.object({
  rule: z.string().min(1),
  passed: z.boolean(),
  severity: z.string().min(1),
  message: z.string()
});
const plan = z.object({
  id: z.uuid(),
  state: z.enum(["AWAITING_APPROVAL", "APPROVED", "COMPLETED"]),
  planHash: z.string().regex(/^[a-f0-9]{64}$/),
  approvedHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  verdict: z.object({
    verdict: z.enum(["ALLOW", "REVIEW", "BLOCK"]),
    checks: z.array(guardCheck).min(1)
  }),
  plan: z.object({
    totals: z.object({
      externalMovement: amount,
      internalAllocation: amount,
      availableAfter: amount
    }),
    actions: z.array(z.object({
      index: z.number().int().nonnegative(),
      label: z.string(),
      amount: amount,
      kind: z.string()
    })).min(1)
  })
});

export const apiSandboxResponseSchema = z.object({
  localUserId: z.uuid(),
  simulated: z.literal(true),
  provider: z.literal("moniflow-sandbox"),
  providerBalance: amount,
  internalAllocated: amount,
  availableToSpend: amount,
  resetCount: z.number().int().nonnegative(),
  activity: z.array(event).max(30),
  plan: plan.nullable()
}).superRefine((value, ctx) => {
  if (value.availableToSpend !== value.providerBalance - value.internalAllocated) {
    ctx.addIssue({ code: "custom", message: "SANDBOX_ACCOUNTING_MISMATCH" });
  }
  const p = value.plan;
  if (!p) {
    if (value.activity.length || value.providerBalance !== 300000 || value.internalAllocated !== 0) {
      ctx.addIssue({ code: "custom", message: "SANDBOX_UNPLANNED_ACTIVITY" });
    }
    return;
  }
  const totals = p.plan.totals;
  if (totals.externalMovement !== 40000 || totals.internalAllocation !== 20000 ||
      totals.availableAfter !== 240000 || p.verdict.verdict !== "REVIEW") {
    ctx.addIssue({ code: "custom", message: "SANDBOX_CANONICAL_PLAN_MISMATCH" });
  }
  if (p.state === "COMPLETED") {
    if (p.approvedHash !== p.planHash || value.providerBalance !== 260000 ||
        value.internalAllocated !== 20000 || value.availableToSpend !== 240000 ||
        value.activity.length !== 2 ||
        !value.activity.some(e => e.kind === "BANK_WITHDRAWAL" && e.amount === 40000 && e.source === "simulated_external") ||
        !value.activity.some(e => e.kind === "POCKET_ALLOCATION" && e.amount === 20000 && e.source === "simulated_internal")) {
      ctx.addIssue({ code: "custom", message: "SANDBOX_COMPLETION_EVIDENCE_MISMATCH" });
    }
  } else if (value.activity.length || value.providerBalance !== 300000 || value.internalAllocated !== 0 ||
    (p.state === "AWAITING_APPROVAL" && p.approvedHash !== null) ||
    (p.state === "APPROVED" && p.approvedHash !== p.planHash)) {
    ctx.addIssue({ code: "custom", message: "SANDBOX_PREAPPROVAL_ACTIVITY_MISMATCH" });
  }
});

export function parseApiSandboxResponse(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The server returned an invalid simulated workspace.");
  }
  const unsafe = value as Record<string, unknown>;
  if (unsafe.realFundsMoved === true || unsafe.executionStarted === true ||
      unsafe.providerEvidenceReference != null || unsafe.simulated !== true) {
    throw new Error("The server response improperly claimed real financial activity.");
  }
  const parsed = apiSandboxResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("The server returned an inconsistent simulated workspace. No financial state was displayed.");
  }
  return parsed.data;
}
