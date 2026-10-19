import { apiFetch } from "@/services/api-fetch";
import { sessionForApiRequest } from "@/services/auth-session";
import { resolveApiUrl } from "@/services/runtime";
import type { AccountWorkspaceOverview } from "@/services/account-workspace";

/** Local reconciliation snapshot. No provider account ownership is asserted. */
export type AccountReconciliationReadiness = {
  authenticated: true;
  userId: string;
  mapping: "not_linked" | "recorded_unverified";
  reconciliation: "identity_evidence_required" | "unverified_mapping" | "manual_review_required";
  identityEvidence: "not_collected";
  providerOwnershipVerified: false;
  automaticLinkingEnabled: false;
  financialOperationsEnabled: false;
};

const mappings = new Set(["not_linked", "recorded_unverified"]);
const reviews = new Set(["identity_evidence_required", "unverified_mapping", "manual_review_required"]);
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Read-only status, scoped twice: a signed-in session and the already validated
 * local workspace snapshot. Never pass user IDs or email as query parameters.
 */
export async function loadAccountReconciliation(
  workspace: AccountWorkspaceOverview
): Promise<AccountReconciliationReadiness> {
  const session = await sessionForApiRequest();
  if (!session || workspace.authenticated !== true ||
      workspace.userId.toLowerCase() !== session.userId.toLowerCase()) {
    throw new Error("Sign in again to check your identity review status.");
  }

  const response = await apiFetch(resolveApiUrl() + "/api/workspace/reconciliation", { method: "GET" });
  if (response.status === 404) {
    throw new Error("Identity review status is not available on this API release yet.");
  }
  if (response.status === 503) {
    let reference: unknown;
    try {
      const unavailable = await response.json() as { code?: unknown; reference?: unknown };
      if (unavailable.code === "RECONCILIATION_READ_UNAVAILABLE") reference = unavailable.reference;
    } catch { /* Malformed or HTML error is never rendered. */ }
    throw new Error("Identity review is temporarily unavailable." +
      (typeof reference === "string" && uuidV4.test(reference) ? " Support reference: " + reference + "." : ""));
  }
  if (!response.ok || !(response.headers.get("content-type") ?? "").includes("application/json")) {
    throw new Error("Identity review could not be verified. Account linking remains disabled.");
  }
  const data = await response.json() as Partial<AccountReconciliationReadiness>;
  const expectedMapping = workspace.mapping === "recorded" ? "recorded_unverified" : "not_linked";
  if (data.authenticated !== true || typeof data.userId !== "string" ||
      data.userId.toLowerCase() !== session.userId.toLowerCase() ||
      !mappings.has(data.mapping ?? "") || data.mapping !== expectedMapping ||
      !reviews.has(data.reconciliation ?? "") ||
      (data.reconciliation === "identity_evidence_required" && data.mapping !== "not_linked") ||
      (data.reconciliation === "unverified_mapping" && data.mapping !== "recorded_unverified") ||
      data.identityEvidence !== "not_collected" ||
      data.providerOwnershipVerified !== false ||
      data.automaticLinkingEnabled !== false ||
      data.financialOperationsEnabled !== false) {
    throw new Error("Identity review did not match your signed-in workspace. No account linking was enabled.");
  }

  const latest = await sessionForApiRequest();
  if (!latest || latest.userId.toLowerCase() !== session.userId.toLowerCase()) {
    throw new Error("The signed-in account changed. Reload identity review.");
  }
  return data as AccountReconciliationReadiness;
}
