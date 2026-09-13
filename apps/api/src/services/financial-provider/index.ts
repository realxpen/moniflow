import { env } from "../../config/env.js";
import { createBmoniGateway } from "../bmoni/index.js";
import { MoniflowSandboxProvider } from "./moniflow-sandbox.js";
import {
  attachFinancialProviderDescriptor,
  BMONI_PROVIDER,
  getFinancialProviderDescriptor,
  type FinancialProviderDescriptor,
  type FinancialProviderGateway,
  type FinancialProviderId
} from "./provider.js";

export {
  getFinancialProviderDescriptor,
  type FinancialProviderDescriptor,
  type FinancialProviderGateway,
  type FinancialProviderId
} from "./provider.js";
export { MoniflowSandboxProvider } from "./moniflow-sandbox.js";

export function createFinancialProvider(): FinancialProviderGateway {
  if (env.FINANCIAL_PROVIDER === "moniflow-sandbox") {
    return new MoniflowSandboxProvider();
  }

  return attachFinancialProviderDescriptor(createBmoniGateway(), BMONI_PROVIDER);
}
