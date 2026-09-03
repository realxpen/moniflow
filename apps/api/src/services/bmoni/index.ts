import { BmoniClient } from "./client.js";
import { getBmoniConfig } from "./config.js";

export { BmoniClient } from "./client.js";
export { getBmoniConfig } from "./config.js";
export {
  BmoniConfigurationError,
  BmoniProviderError,
  BmoniResponseValidationError,
  BmoniTransportError
} from "./errors.js";
export type { BmoniGateway } from "./gateway.js";
export {
  bmoniErrorEnvelopeSchema,
  bmoniUserSchema,
  createBmoniUserInputSchema,
  createBmoniUserResponseSchema,
  supportedSmartWalletCurrenciesSchema
} from "./schemas.js";
export type {
  BmoniErrorEnvelope,
  BmoniUser,
  CreateBmoniUserInput,
  SupportedSmartWalletCurrencies
} from "./schemas.js";

export function createBmoniGateway() {
  return new BmoniClient(getBmoniConfig());
}
