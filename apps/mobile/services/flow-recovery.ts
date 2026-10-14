import type { DemoProviderId, DemoRecoveryStage } from "@/store/demo-session";

/** No API calls, provider mutations, or automatic navigation live in this module. */
export type RecoveryInput = {
  hydrated: boolean;
  savedLocalUserId: string;
  selectedLocalUserId: string;
  authUserId: string | null;
  development: boolean;
  stage: DemoRecoveryStage | null;
  planId: string;
  provider: DemoProviderId | null;
};
export type RecoveryDecision =
  | { kind: "none" }
  | { kind: "blocked"; reason: string }
  | { kind: "restart"; reason: string }
  | { kind: "ready"; route: "/operator/guard" | "/operator/approve" | "/operator/signing" | "/operator/execution" | "/operator/result"; planId: string; localUserId: string };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** A browser URL or stale AsyncStorage value cannot choose another production workspace. */
export function workspaceIdentity(input: {
  routedId?: string; savedId?: string; devId?: string;
  authUserId: string | null; development: boolean;
}): string {
  const routed = input.routedId?.trim() ?? "";
  const saved = input.savedId?.trim() ?? "";
  if (input.development) return routed || saved || input.devId?.trim() || "";
  if (!input.authUserId || !uuid.test(input.authUserId)) return "";
  if (routed && !sameId(routed, input.authUserId)) return "";
  if (saved && !sameId(saved, input.authUserId)) return "";
  return routed || saved || "";
}

/**
 * A recoverable plan is always opened after a deliberate tap. Server-side
 * authorization and the persisted plan remain the source of truth.
 */
export function recoveryDecision(input: RecoveryInput): RecoveryDecision {
  if (!input.hydrated || !input.savedLocalUserId || !input.stage || input.stage === "home") {
    return { kind: "none" };
  }
  if (!input.selectedLocalUserId || !sameId(input.selectedLocalUserId, input.savedLocalUserId)) {
    return { kind: "blocked", reason: "This saved checkpoint belongs to a different local workspace." };
  }
  if (!input.development &&
      (!input.authUserId || !sameId(input.authUserId, input.savedLocalUserId))) {
    return { kind: "blocked", reason: "Sign in to the original account to review the saved checkpoint." };
  }
  if (!input.provider) {
    return { kind: "blocked", reason: "The saved financial provider is unknown." };
  }
  if (!uuid.test(input.planId)) {
    return {
      kind: "restart",
      reason: "This instruction has no persisted plan to recover. Re-enter it to start a new plan; MONIFlow will not replay it automatically."
    };
  }
  const routes: Record<DemoRecoveryStage, RecoveryDecision["kind"] extends never ? never : string> = {
    home: "/operator/guard",
    processing: "/operator/guard",
    plan: "/operator/guard",
    guard: "/operator/guard",
    approve: "/operator/approve",
    signing: "/operator/signing",
    execution: "/operator/execution",
    result: "/operator/result"
  };
  return {
    kind: "ready",
    route: routes[input.stage] as Extract<RecoveryDecision, { kind: "ready" }>["route"],
    localUserId: input.savedLocalUserId,
    planId: input.planId
  };
}
