import type { z } from "zod";

import type { BmoniConfig } from "./config.js";
import {
  BmoniProviderError,
  BmoniResponseValidationError,
  BmoniTransportError
} from "./errors.js";
import type { BmoniGateway } from "./gateway.js";
import {
  bmoniErrorEnvelopeSchema,
  createBmoniUserResponseSchema,
  supportedSmartWalletCurrenciesSchema,
  type BmoniUser,
  type CreateBmoniUserInput,
  type SupportedSmartWalletCurrencies
} from "./schemas.js";

type FetchImplementation = typeof fetch;

type RequestOptions = {
  body?: unknown;
  method: "GET" | "POST";
};

export class BmoniClient implements BmoniGateway {
  constructor(
    private readonly config: BmoniConfig,
    private readonly fetchImplementation: FetchImplementation = fetch
  ) {}

  async getSupportedSmartWalletCurrencies(): Promise<SupportedSmartWalletCurrencies> {
    return this.request(
      "/v1/smart-wallets/supported-currencies",
      supportedSmartWalletCurrenciesSchema,
      { method: "GET" }
    );
  }

  async createUser(input: CreateBmoniUserInput): Promise<BmoniUser> {
    const response = await this.request("/v1/users", createBmoniUserResponseSchema, {
      body: input,
      method: "POST"
    });

    return response.user;
  }

  private async request<TSchema extends z.ZodType>(
    path: `/v1/${string}`,
    responseSchema: TSchema,
    options: RequestOptions
  ): Promise<z.infer<TSchema>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    try {
      const response = await this.fetchImplementation(
        new URL(path.slice(1), this.config.baseUrl),
        {
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          headers: {
            accept: "application/json",
            ...(options.body === undefined ? {} : { "content-type": "application/json" }),
            "x-api-key": this.config.apiKey
          },
          method: options.method,
          signal: controller.signal
        }
      );
      const requestId = response.headers.get("x-request-id");
      const payload = await this.readJson(response, requestId);

      if (!response.ok) {
        const providerError = bmoniErrorEnvelopeSchema.safeParse(payload);
        throw new BmoniProviderError(
          response.status,
          providerError.success ? providerError.data : null,
          requestId
        );
      }

      const parsed = responseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new BmoniResponseValidationError(requestId, { cause: parsed.error });
      }

      return parsed.data;
    } catch (error) {
      if (
        error instanceof BmoniProviderError ||
        error instanceof BmoniResponseValidationError
      ) {
        throw error;
      }

      const timedOut = controller.signal.aborted;
      throw new BmoniTransportError(
        timedOut ? "BMONI request timed out." : "BMONI could not be reached.",
        timedOut,
        { cause: error }
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readJson(response: Response, requestId: string | null): Promise<unknown> {
    const rawBody = await response.text();

    try {
      return JSON.parse(rawBody) as unknown;
    } catch (error) {
      throw new BmoniResponseValidationError(requestId, { cause: error });
    }
  }
}
