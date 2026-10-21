import { env } from "../../config/env.js";

/**
 * BMONI payment execution is NOT released. The signed partner contract,
 * supported-device ownership proof, KYC and cross-instance provider
 * idempotency requirements have not all been demonstrated.
 *
 * Never accept a secret or a client flag as permission to bypass this.
 * Test injection and the explicitly simulated local provider remain usable.
 */
export function canUseFinancialExecution(
  provider: "bmoni" | "moniflow-sandbox",
  environment: "development" | "test" | "production",
  hasProviderCredentials = false
): boolean {
  // Tests may exercise injected fake gateways, but may not rely on NODE_ENV
  // alone to bypass a release gate when real provider credentials are present.
  return provider === "moniflow-sandbox" ||
    (environment === "test" && !hasProviderCredentials);
}

export function realFinancialExecutionReleased(): boolean {
  return canUseFinancialExecution(
    env.FINANCIAL_PROVIDER,
    env.NODE_ENV,
    Boolean(env.BMONI_API_KEY || env.BMONI_BASE_URL)
  );
}

export const REAL_EXECUTION_RELEASE_CODE = "BMONI_FINANCIAL_EXECUTION_NOT_RELEASED" as const;
