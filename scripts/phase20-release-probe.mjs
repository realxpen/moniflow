// Read-only Phase 20 production smoke probe. It never sends credentials or mutates state.
export const PRODUCTION_API = "https://moniflow-api-silk.vercel.app";
export const PRODUCTION_WEB = "https://moniflow-indol.vercel.app";

function checked(name, ok, detail) {
  return { name, ok: Boolean(ok), detail: ok ? "verified" : detail };
}

async function get(url, fetchImpl, timeoutMs) {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { accept: "application/json" },
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs)
  });
  let body = null;
  if (response.headers.get("content-type")?.includes("json")) {
    try { body = await response.json(); } catch { /* malformed response is a failed check */ }
  }
  return { status: response.status, body };
}

/**
 * Probe only published public endpoints. Authenticated journey checks must
 * still be performed manually using disposable accounts after publication.
 */
export async function probePhase20({
  api = PRODUCTION_API,
  web = PRODUCTION_WEB,
  fetchImpl = fetch,
  timeoutMs = 8000
} = {}) {
  const checks = [];
  const isHttpsOrigin = value => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.origin === value && !url.username && !url.password;
    } catch { return false; }
  };
  checks.push(checked("HTTPS origins", isHttpsOrigin(api) && isHttpsOrigin(web), "Both endpoints must be HTTPS origins"));
  if (!checks[0].ok) return checks;

  async function probe(name, url, assess) {
    try {
      const res = await get(url, fetchImpl, timeoutMs);
      checks.push(...assess(res));
    } catch {
      checks.push(checked(name, false, "Endpoint unavailable or timed out"));
    }
  }

  await probe("API production health", api + "/health", ({ status, body }) => [
    checked("API production health", status === 200 && body?.status === "ok" &&
      body?.service === "moniflow-api" && body?.environment === "production",
    "Expected HTTP 200, moniflow-api and environment=production")
  ]);
  await probe("Financial provider readiness", api + "/health/provider", ({ status, body }) => [
    checked("Financial provider readiness", status === 200 && body?.status === "ok",
      "Financial provider health must return HTTP 200"),
    checked("Partner onboarding stays locked", body?.partnerRegistrationEnabled === false,
      "Partner registration must remain explicitly disabled"),
    checked("Authenticated sandbox advertised", body?.authenticatedSandboxDemoEnabled === true,
      "Sandbox flag must be true before promoting the demo")
  ]);
  await probe("Unauthenticated sandbox isolation", api + "/api/sandbox-demo/status", ({ status, body }) => [
    checked("Unauthenticated sandbox isolation", status === 401 && body?.code === "AUTH_REQUIRED",
      "Unauthenticated GET must reject access with AUTH_REQUIRED")
  ]);
  await probe("Web demo route", web + "/demo/live", ({ status }) => [
    checked("Web demo route", status === 200, "Expected HTTP 200 for the published demo route")
  ]);

  return checks;
}
