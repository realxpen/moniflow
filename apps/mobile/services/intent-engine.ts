import { apiFetch } from "@/services/api-fetch";
import { resolveApiUrl } from "@/services/runtime";

export type AtomicIntent =
  | { intent: "CHECK_BALANCE"; currency: "NGN"; requiresApproval: false }
  | {
      intent: "BANK_WITHDRAWAL";
      currency: "NGN";
      amount: number;
      destination: { kind: "SAVED_BANK"; label: string };
      requiresApproval: true;
    }
  | { intent: "CREATE_POCKET"; pocket: { name: string }; requiresApproval: false }
  | {
      intent: "ALLOCATE_POCKET";
      currency: "NGN";
      amount: number;
      pocket: { name: string };
      requiresApproval: false;
    }
  | { intent: "SHOW_ACTIVITY"; requiresApproval: false };

export type MoniflowIntent =
  | AtomicIntent
  | { intent: "MULTI_ACTION"; actions: AtomicIntent[]; requiresApproval: boolean }
  | {
      intent: "UNSUPPORTED";
      requiresApproval: false;
      reason: "EMPTY" | "AMBIGUOUS" | "UNSUPPORTED_ACTION" | "INCOMPLETE_ACTION";
    };

export async function parseOperatorIntent(input: string): Promise<MoniflowIntent> {
  const response = await apiFetch(`${resolveApiUrl()}/api/operator/intent`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input })
  });
  const payload = (await response.json()) as {
    intent?: MoniflowIntent;
    message?: string;
  };
  if (!response.ok || !payload.intent) {
    throw new Error(payload.message ?? "MONIFlow could not parse that instruction.");
  }
  return payload.intent;
}
