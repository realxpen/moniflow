import type { BmoniGateway } from "../bmoni/index.js";

export type FinancialProviderId = "bmoni" | "moniflow-sandbox";

export type FinancialProviderDescriptor = {
  id: FinancialProviderId;
  label: string;
  environment: "sandbox" | "development";
  simulated: boolean;
};

export type FinancialProviderGateway = BmoniGateway & {
  readonly provider: FinancialProviderDescriptor;
};

export const BMONI_PROVIDER: FinancialProviderDescriptor = Object.freeze({
  id: "bmoni",
  label: "BMONI",
  environment: "sandbox",
  simulated: false
});

export const MONIFLOW_SANDBOX_PROVIDER: FinancialProviderDescriptor = Object.freeze({
  id: "moniflow-sandbox",
  label: "MONIFlow Sandbox",
  environment: "development",
  simulated: true
});

export function attachFinancialProviderDescriptor<T extends BmoniGateway>(
  gateway: T,
  provider: FinancialProviderDescriptor
): T & FinancialProviderGateway {
  Object.defineProperty(gateway, "provider", {
    configurable: false,
    enumerable: true,
    value: provider,
    writable: false
  });
  return gateway as T & FinancialProviderGateway;
}

export function getFinancialProviderDescriptor(
  gateway: BmoniGateway
): FinancialProviderDescriptor {
  const candidate = gateway as Partial<FinancialProviderGateway>;
  return candidate.provider ?? BMONI_PROVIDER;
}
