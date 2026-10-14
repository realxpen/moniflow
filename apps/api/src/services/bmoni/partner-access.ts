/**
 * BMONI API connectivity does not prove a dedicated MONIFlow partner credential.
 * Explicit operator approval is required before any BMONI user-creation request.
 */
export function partnerRegistrationEnabled(provider: "bmoni" | "moniflow-sandbox", enabled: "true" | "false"): boolean {
  return provider === "bmoni" && enabled === "true";
}
