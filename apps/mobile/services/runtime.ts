import { apiFetch } from "@/services/api-fetch";

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";

export type FinancialProviderRuntime = {
  status: "ok" | "unavailable";
  provider: "bmoni" | "moniflow-sandbox";
  label: string;
  environment: string;
  simulated: boolean;
  currencies: string[];
};

export type DemoBootstrapState = {
  provider: {
    id: "moniflow-sandbox";
    label: string;
    environment: string;
    simulated: true;
  };
  identity: {
    localUserId: string;
    providerUserId: string;
    status: "created" | "existing";
  };
  canonicalInstruction: string;
  reset?: {
    strategy: "fresh_demo_identity";
    previousHistoryPreserved: boolean;
    localUserId: string;
  };
};

export function resolveApiUrl() {
  const raw = configuredApiUrl.trim();
  if (!raw) {
    if (__DEV__) return "http://localhost:4000";
    throw new Error("MONIFlow API URL is not configured for this deployment.");
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("MONIFlow API URL is invalid. Set EXPO_PUBLIC_API_URL to the public API domain.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("EXPO_PUBLIC_API_URL must never contain credentials.");
  }
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && __DEV__)) {
    throw new Error("MONIFlow API URL must use HTTPS outside development.");
  }
  return raw.replace(/\/$/, "");
}

export async function loadFinancialProvider(): Promise<FinancialProviderRuntime> {
  const response = await apiFetch(`${resolveApiUrl()}/health/provider`);
  const payload = (await response.json()) as Partial<FinancialProviderRuntime> & { message?: string };
  if (!response.ok || !payload.provider) {
    throw new Error(payload.message ?? "Financial provider is unavailable.");
  }
  return {
    status: payload.status === "ok" ? "ok" : "unavailable",
    provider: payload.provider,
    label: payload.label ?? (payload.provider === "bmoni" ? "BMONI" : "MONIFlow Sandbox"),
    environment: payload.environment ?? "unknown",
    simulated: Boolean(payload.simulated),
    currencies: Array.isArray(payload.currencies) ? payload.currencies : []
  };
}

export async function resetSandboxDemo(): Promise<DemoBootstrapState> {
  const response = await apiFetch(`${resolveApiUrl()}/api/dev/reset`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  });
  const payload = (await response.json()) as DemoBootstrapState & { message?: string };
  if (!response.ok || !payload.identity?.localUserId) {
    throw new Error(payload.message ?? "MONIFlow sandbox workspace could not be prepared.");
  }
  return payload;
}

export function providerBadge(provider: FinancialProviderRuntime | null) {
  if (!provider) return "PROVIDER CHECK";
  return provider.provider === "bmoni" ? "BMONI SANDBOX" : "MONIFLOW SANDBOX";
}

export function providerName(provider: FinancialProviderRuntime | null) {
  if (!provider) return "provider";
  return provider.provider === "bmoni" ? "BMONI" : "MONIFlow Sandbox";
}
