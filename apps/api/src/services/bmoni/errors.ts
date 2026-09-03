import type { BmoniErrorEnvelope } from "./schemas.js";

export class BmoniConfigurationError extends Error {
  override readonly name = "BmoniConfigurationError";
}

export class BmoniTransportError extends Error {
  override readonly name = "BmoniTransportError";

  constructor(
    message: string,
    readonly timedOut: boolean,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

export class BmoniProviderError extends Error {
  override readonly name = "BmoniProviderError";

  constructor(
    readonly statusCode: number,
    readonly providerError: BmoniErrorEnvelope | null,
    readonly requestId: string | null
  ) {
    super(`BMONI request failed with HTTP ${statusCode}.`);
  }
}

export class BmoniResponseValidationError extends Error {
  override readonly name = "BmoniResponseValidationError";

  constructor(readonly requestId: string | null, options?: ErrorOptions) {
    super("BMONI returned a response that does not match the documented contract.", options);
  }
}
