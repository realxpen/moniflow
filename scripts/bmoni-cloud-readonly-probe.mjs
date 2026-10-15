// Production API health checks from GitHub-hosted runner only.
// No credentials, request bodies, private identity, provider mutations, or retries.
export const MONIFLOW_API = "https://moniflow-api-silk.vercel.app";
const reqs = [
  ["api", "/health"],
  ["bmoni", "/health/bmoni"],
  ["provider", "/health/provider"]
];

export async function probeBmoniCloud(fetchImpl = fetch) {
  const findings = [];
  for (const [name, path] of reqs) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      let response;
      try {
        response = await fetchImpl(MONIFLOW_API + path, {
          method: "GET", redirect: "manual",
          headers: { accept: "application/json" },
          signal: controller.signal
        });
      } finally { clearTimeout(timeout); }
      let payload = null;
      if ((response.headers.get("content-type") ?? "").includes("application/json")) {
        try { payload = await response.json(); } catch { /* fail closed */ }
      }
      const valid = payload !== null && typeof payload === "object" && !Array.isArray(payload);
      if (name === "api") {
        findings.push({
          check: "production-api", pass: response.status === 200 && valid &&
            payload.status === "ok" && payload.service === "moniflow-api" &&
            payload.environment === "production",
          detail: response.status === 200 ? "API HTTP 200" : "API HTTP " + response.status
        });
      } else if (name === "bmoni") {
        findings.push({
          check: "direct-bmoni-sandbox-connection", pass: response.status === 200 && valid &&
            payload.status === "ok" && payload.service === "bmoni" &&
            payload.environment === "sandbox" && Array.isArray(payload.currencies) &&
            payload.currencies.length > 0,
          detail: valid && typeof payload.reason === "string"
            ? "BMONI status: " + safeReason(payload.reason)
            : response.status === 200 ? "Provider health HTTP 200" : "Provider health HTTP " + response.status
        });
      } else {
        findings.push({
          check: "provider-identity-and-partner-gate",
          pass: response.status === 200 && valid && payload.status === "ok" &&
            payload.provider === "bmoni" && payload.simulated === false &&
            payload.partnerRegistrationEnabled === false,
          detail: valid && payload.partnerRegistrationEnabled === true
            ? "BMONI partner registration unexpectedly enabled"
            : "Provider contract or partner-registration guard did not match"
        });
      }
    } catch {
      findings.push({ check: name === "api" ? "production-api" : name === "bmoni"
        ? "direct-bmoni-sandbox-connection" : "provider-identity-and-partner-gate",
        pass: false, detail: "Cloud endpoint inaccessible or timed out" });
    }
  }
  return findings;
}
function safeReason(reason) {
  return new Set(["not_configured", "contract_mismatch", "provider_unavailable", "not_selected", "unexpected_error"])
    .has(reason) ? reason : "unclassified";
}
