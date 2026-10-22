import { z } from "zod";

import type { ApiSandboxWorkspace } from "./sandbox-api";
import { isConsistentSandboxReadModel } from "./sandbox-view";

const money = z.number().int().nonnegative().refine(Number.isSafeInteger);
const positiveMoney = money.refine(value => value > 0);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const activity = z.object({
  reference: z.string().min(1).max(160),
  kind: z.enum(["BANK_WITHDRAWAL", "POCKET_ALLOCATION"]),
  source: z.enum(["simulated_external", "simulated_internal"]),
  amount: positiveMoney,
  label: z.string().min(1).max(100),
  status: z.literal("SIMULATED")
}).strict();

const plan = z.object({
  id: z.uuid(),
  state: z.enum(["AWAITING_APPROVAL", "APPROVED", "COMPLETED"]),
  planHash: hash,
  approvedHash: hash.nullable(),
  verdict: z.object({
    verdict: z.enum(["ALLOW", "REVIEW", "BLOCK"]),
    checks: z.array(z.object({
      rule: z.string().min(1),
      passed: z.boolean(),
      severity: z.enum(["info", "warning", "critical"]),
      message: z.string().min(1)
    }).strict()).length(8)
  }).strict(),
  plan: z.object({
    totals: z.object({
      externalMovement: positiveMoney,
      internalAllocation: positiveMoney,
      availableAfter: money
    }).passthrough(),
    actions: z.array(z.object({
      index: z.number().int().positive(),
      kind: z.enum(["BANK_WITHDRAWAL", "ALLOCATE_POCKET"]),
      amount: positiveMoney,
      label: z.string().min(1)
    }).passthrough()).length(2)
  }).passthrough()
}).passthrough();

const workspace = z.object({
  localUserId: z.uuid(),
  simulated: z.literal(true),
  provider: z.literal("moniflow-sandbox"),
  providerBalance: money,
  internalAllocated: money,
  availableToSpend: money,
  resetCount: z.number().int().nonnegative().refine(Number.isSafeInteger),
  plan: plan.nullable(),
  activity: z.array(activity).max(2)
}).passthrough();

/** Reject malformed API data instead of displaying unverified balances or settled claims. */
export function parseSandboxWorkspace(value: unknown): ApiSandboxWorkspace {
  const parsed = workspace.safeParse(value);
  if (!parsed.success) {
    throw new Error("Invalid simulated workspace response. Financial amounts were withheld.");
  }
  const result = parsed.data as ApiSandboxWorkspace;
  const p = result.plan;
  if (!isConsistentSandboxReadModel(result) ||
      (p?.state === "COMPLETED" && (
        p.approvedHash !== p.planHash ||
        p.plan.totals.availableAfter !== result.availableToSpend
      )) ||
      (p?.state === "AWAITING_APPROVAL" && p.approvedHash !== null)) {
    throw new Error("Inconsistent simulated ledger. Financial amounts were withheld.");
  }
  return result;
}
