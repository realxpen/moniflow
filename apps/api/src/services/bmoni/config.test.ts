import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadConfig() {
  vi.resetModules();
  return import("./config.js");
}

describe("getBmoniConfig", () => {
  it("accepts the documented sandbox origin in a production Node runtime", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BMONI_BASE_URL", "https://embedded-dev.bmoni.com");
    vi.stubEnv("BMONI_API_KEY", "test-key");
    const { getBmoniConfig } = await loadConfig();

    expect(getBmoniConfig()).toMatchObject({
      apiKey: "test-key",
      environment: "sandbox"
    });
  });

  it("rejects a different provider host even in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BMONI_BASE_URL", "https://embedded.bmoni.com");
    vi.stubEnv("BMONI_API_KEY", "test-key");
    const { getBmoniConfig } = await loadConfig();

    expect(() => getBmoniConfig()).toThrow("development host");
  });

  it("rejects a sandbox URL that is not origin-only", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BMONI_BASE_URL", "https://embedded-dev.bmoni.com/v1");
    vi.stubEnv("BMONI_API_KEY", "test-key");
    const { getBmoniConfig } = await loadConfig();

    expect(() => getBmoniConfig()).toThrow("origin only");
  });
});
