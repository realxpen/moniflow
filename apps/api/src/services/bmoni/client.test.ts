import { describe, expect, it, vi } from "vitest";

import { BmoniClient } from "./client.js";
import { BmoniProviderError, BmoniResponseValidationError } from "./errors.js";

const config = {
  apiKey: "test-key",
  baseUrl: new URL("https://embedded-dev.bmoni.com"),
  environment: "sandbox" as const,
  requestTimeoutMs: 1_000
};

describe("BmoniClient", () => {
  it("sends the server-side API key and validates supported currencies", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ currencies: ["CNGN", "USDB"] }), {
        headers: { "content-type": "application/json" },
        status: 200
      })
    );
    const client = new BmoniClient(config, request);

    await expect(client.getSupportedSmartWalletCurrencies()).resolves.toEqual({
      currencies: ["CNGN", "USDB"]
    });

    const [url, init] = request.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://embedded-dev.bmoni.com/v1/smart-wallets/supported-currencies"
    );
    expect(init?.headers).toMatchObject({ "x-api-key": "test-key" });
  });

  it("maps documented provider errors without exposing the request key", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 409, message: "Already exists", error: "Conflict" }),
        { headers: { "x-request-id": "request-123" }, status: 409 }
      )
    );
    const client = new BmoniClient(config, request);

    const error = await client.createUser({
      email: "ada@example.com",
      firstName: "Ada",
      phoneNumber: "+2348012345678"
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BmoniProviderError);
    expect(error).toMatchObject({ requestId: "request-123", statusCode: 409 });
    expect(JSON.stringify(error)).not.toContain(config.apiKey);
  });

  it("rejects undocumented success responses", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ currencies: "CNGN" }), { status: 200 })
    );
    const client = new BmoniClient(config, request);

    await expect(client.getSupportedSmartWalletCurrencies()).rejects.toBeInstanceOf(
      BmoniResponseValidationError
    );
  });
});
