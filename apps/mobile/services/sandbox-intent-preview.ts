import { apiFetch } from "./api-fetch";
import { SandboxApiError } from "./sandbox-api";
import { parseSandboxIntentPreview } from "./sandbox-intent-preview-validation";

export type { SandboxIntentPreview } from "./sandbox-intent-preview-validation";

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
