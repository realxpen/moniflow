export type ProviderHealthBody = {
  status?: unknown;
  provider?: unknown;
  label?: unknown;
  environment?: unknown;
  simulated?: unknown;
  currencies?: unknown;
  reason?: unknown;
  partnerRegistrationEnabled?: unknown;
  authenticatedSandboxDemoEnabled?: unknown;
};

export function providerHealthProblem(status: number, body: ProviderHealthBody) {
  const reason = typeof body.reason === "string" ? body.reason : "unknown";
  if (status === 502 || reason === "contract_mismatch") {
    return { reason: "contract_mismatch", message: "BMONI returned unexpected data. Its contract needs checking before onboarding continues." };
  }
  if (reason === "not_configured") {
    return { reason, message: "BMONI sandbox credentials are not configured on the API. Partner access must be confirmed." };
  }
  if (reason === "provider_unavailable") {
    return { reason, message: "BMONI sandbox is not responding. MONIFlow sign-in is separate from provider availability." };
  }
  if (status === 401 || status === 403) {
    return { reason: "api_access", message: "The API health request was blocked. Check the API domain and deployment access." };
  }
  if (status === 503) {
    return { reason, message: "The selected financial provider is not ready. No wallet operation was completed." };
  }
  return { reason, message: "The financial provider's status could not be verified." };
}

export function providerHealthBadge(provider: "bmoni" | "moniflow-sandbox", status: "ok" | "unavailable") {
  const label = provider === "bmoni" ? "BMONI" : "MONIFLOW SANDBOX";
  if (status !== "ok") return label + " UNAVAILABLE";
  return provider === "bmoni" ? "BMONI SANDBOX" : label;
}
