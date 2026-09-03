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
  it("accepts only the documented sandbox origin", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("BMONI_BASE_URL", "https://embedded-dev.bmoni.com");
    vi.stubEnv("BMONI_API_KEY", "test-key");
    const { getBmoniConfig } = await loadConfig();

    expect(getBmoniConfig()).toMatchObject({
      apiKey: "test-key",
      environment: "sandbox"
    });
  });

  it("rejects the sandbox client in production mode", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BMONI_BASE_URL", "https://embedded-dev.bmoni.com");
    vi.stubEnv("BMONI_API_KEY", "test-key");
    const { getBmoniConfig } = await loadConfig();

    expect(() => getBmoniConfig()).toThrow("cannot run in production mode");
  });

  it("rejects a different provider host", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("BMONI_BASE_URL", "https://embedded.bmoni.com");
    vi.stubEnv("BMONI_API_KEY", "test-key");
    const { getBmoniConfig } = await loadConfig();

    expect(() => getBmoniConfig()).toThrow("development host");
  });
});
