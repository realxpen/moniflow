import { env } from "../../config/env.js";

import { BmoniConfigurationError } from "./errors.js";

const SANDBOX_HOSTNAME = "embedded-dev.bmoni.com";

export type BmoniConfig = {
  apiKey: string;
  baseUrl: URL;
  environment: "sandbox";
  requestTimeoutMs: number;
};

export function getBmoniConfig(): BmoniConfig {
  if (env.NODE_ENV === "production") {
    throw new BmoniConfigurationError(
      "The Phase 2 BMONI client is sandbox-only and cannot run in production mode."
    );
  }

  if (!env.BMONI_BASE_URL || !env.BMONI_API_KEY) {
    throw new BmoniConfigurationError(
      "BMONI sandbox configuration is incomplete. Set BMONI_BASE_URL and BMONI_API_KEY server-side."
    );
  }

  const baseUrl = new URL(env.BMONI_BASE_URL);

  if (baseUrl.protocol !== "https:" || baseUrl.hostname !== SANDBOX_HOSTNAME) {
    throw new BmoniConfigurationError(
      "Hackathon builds may connect only to the confirmed BMONI development host."
    );
  }

  if (baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash) {
    throw new BmoniConfigurationError(
      "BMONI_BASE_URL must be the origin only, without /v1, a query, or a fragment."
    );
  }

  return {
    apiKey: env.BMONI_API_KEY,
    baseUrl,
    environment: "sandbox",
    requestTimeoutMs: env.BMONI_REQUEST_TIMEOUT_MS
  };
}
