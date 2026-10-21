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
  environment: "development" | "test" | "production"
): boolean {
  return environment === "test" || provider === "moniflow-sandbox";
}

export function realFinancialExecutionReleased(): boolean {
  return canUseFinancialExecution(env.FINANCIAL_PROVIDER, env.NODE_ENV);
}

export const REAL_EXECUTION_RELEASE_CODE = "BMONI_FINANCIAL_EXECUTION_NOT_RELEASED" as const;
