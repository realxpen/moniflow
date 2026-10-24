import { z } from "zod";
import { apiFetch } from "./api-fetch";
import { SandboxApiError } from "./sandbox-api";

const balance = z.number().int().min(0).max(300_000);
const amount = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const planAction = z.object({
  index: z.number().int().min(1).max(5),
  kind: z.enum(["BANK_WITHDRAWAL", "ALLOCATE_POCKET", "CREATE_POCKET", "CHECK_BALANCE", "SHOW_ACTIVITY"]),
  label: z.string().min(1).max(160),
  amount
}).strict();
const common = {
  localUserId: z.uuid(),
  provider: z.literal("moniflow-sandbox"),
  simulated: z.literal(true),
  previewOnly: z.literal(true),
  realFundsMoved: z.literal(false),
  availableToSpend: balance
};
export const sandboxIntentPreviewSchema = z.discriminatedUnion("status", [
  z.object({ ...common, status: z.literal("UNSUPPORTED"),
    reason: z.enum(["EMPTY", "AMBIGUOUS", "UNSUPPORTED_ACTION", "INCOMPLETE_ACTION"]) }).strict(),
  z.object({
    ...common,
    status: z.literal("PREVIEW"),
    intent: z.enum(["MULTI_ACTION", "BANK_WITHDRAWAL", "ALLOCATE_POCKET",
      "CREATE_POCKET", "CHECK_BALANCE", "SHOW_ACTIVITY"]),
    verdict: z.enum(["ALLOW", "REVIEW", "BLOCK"]),
    checks: z.array(z.object({
      rule: z.string().min(1), passed: z.boolean(),
      severity: z.enum(["info", "warning", "critical"]), message: z.string().min(1)
    }).strict()).length(8),
    actions: z.array(planAction).min(1).max(5),
    totals: z.object({
      externalMovement: amount,
      internalAllocation: amount,
      totalCommitted: amount,
      availableAfter: z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER)
    }).strict()
  }).strict()
]);

export type SandboxIntentPreview = z.infer<typeof sandboxIntentPreviewSchema>;

export function parseSandboxIntentPreview(payload: unknown): SandboxIntentPreview {
  const parsed = sandboxIntentPreviewSchema.safeParse(payload);
  if (!parsed.success) throw new Error("The API returned an invalid simulated intent preview.");
  const value = parsed.data;
  if (value.status === "PREVIEW") {
    const external = value.actions.filter(a => a.kind === "BANK_WITHDRAWAL")
      .reduce((sum, a) => sum + a.amount, 0);
    const internal = value.actions.filter(a => a.kind === "ALLOCATE_POCKET")
      .reduce((sum, a) => sum + a.amount, 0);
    if (external !== value.totals.externalMovement ||
        internal !== value.totals.internalAllocation ||
        external + internal !== value.totals.totalCommitted ||
        value.availableToSpend - value.totals.totalCommitted !== value.totals.availableAfter ||
        value.actions.some((a, i) => a.index !== i + 1) ||
        (value.totals.availableAfter < 0 && value.verdict !== "BLOCK") ||
        (value.actions.filter(a => a.kind === "BANK_WITHDRAWAL").length > 1 && value.verdict !== "BLOCK") ||
        (value.checks.some(c => !c.passed && c.severity === "critical") && value.verdict !== "BLOCK")) {
      throw new Error("The API returned contradictory Money Plan totals or Guard status.");
    }
  }
  return value;
}

export async function previewApiSandboxIntent(command: string): Promise<SandboxIntentPreview> {
  const base = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
  const response = await apiFetch(base + "/api/sandbox-demo/preview", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ command })
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    throw new SandboxApiError(
      typeof error.code === "string" ? error.code : "PREVIEW_UNAVAILABLE",
      response.status,
      typeof error.message === "string" ? error.message : "Could not review this simulated instruction."
    );
  }
  return parseSandboxIntentPreview(payload);
}
