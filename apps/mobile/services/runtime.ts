import { apiFetch } from "@/services/api-fetch";
import { providerHealthBadge, providerHealthProblem, type ProviderHealthBody } from "@/services/provider-health";

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";

export type FinancialProviderRuntime = {
  status: "ok" | "unavailable";
  provider: "bmoni" | "moniflow-sandbox";
  label: string;
  environment: string;
  simulated: boolean;
  currencies: string[];
  partnerRegistrationEnabled: boolean;
  authenticatedSandboxDemoEnabled: boolean;
  reason?: string;
  issue?: string;
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
  const response = await apiFetch(resolveApiUrl() + "/health/provider");
  if (!(response.headers.get("content-type") ?? "").includes("application/json")) {
    throw new Error("MONIFlow API returned a non-JSON response. Check the API domain and Vercel Deployment Protection.");
  }
  const payload = (await response.json()) as ProviderHealthBody;
  if (payload.provider !== "bmoni" && payload.provider !== "moniflow-sandbox") {
    throw new Error("MONIFlow API did not identify a supported financial provider.");
  }
  const ready = response.ok && payload.status === "ok";
  const problem = ready ? null : providerHealthProblem(response.status, payload);
  return {
    status: ready ? "ok" : "unavailable",
    provider: payload.provider,
    label: typeof payload.label === "string" ? payload.label : payload.provider === "bmoni" ? "BMONI" : "MONIFlow Sandbox",
    environment: typeof payload.environment === "string" ? payload.environment : "unknown",
    simulated: payload.simulated === true,
    partnerRegistrationEnabled: payload.partnerRegistrationEnabled === true,
    authenticatedSandboxDemoEnabled: payload.authenticatedSandboxDemoEnabled === true,
    currencies: Array.isArray(payload.currencies) ? payload.currencies.filter((v): v is string => typeof v === "string") : [],
    ...(problem ? { reason: problem.reason, issue: problem.message } : {})
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
  return providerHealthBadge(provider.provider, provider.status);
}

export function providerName(provider: FinancialProviderRuntime | null) {
  if (!provider) return "provider";
  return provider.provider === "bmoni" ? "BMONI" : "MONIFlow Sandbox";
}
