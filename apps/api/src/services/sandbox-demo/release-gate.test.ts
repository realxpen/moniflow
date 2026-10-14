import { describe, expect, it } from "vitest";
import { sandboxReleaseIssues, assertSandboxReleaseReady } from "./release-gate.js";

const ready = {
  NODE_ENV: "production" as const,
  DATABASE_URL: "postgresql://user:private@db.example.test:5432/moniflow",
  AUTH_ISSUER: "https://project.supabase.co/auth/v1",
  AUTH_JWKS_URL: "https://project.supabase.co/auth/v1/.well-known/jwks.json",
  AUTH_AUDIENCE: "authenticated"
};

describe("fail-closed authenticated sandbox release gate", () => {
  it("accepts dedicated production JWT and persistent Postgres settings", () => {
    expect(sandboxReleaseIssues(ready)).toEqual([]);
    expect(() => assertSandboxReleaseReady(ready)).not.toThrow();
  });
  it("rejects transient production storage and development-mode public APIs", () => {
    expect(sandboxReleaseIssues({ ...ready, DATABASE_URL: "file:./moniflow.db" })).toContain("PERSISTENT_POSTGRES_REQUIRED");
    expect(sandboxReleaseIssues({ ...ready, NODE_ENV: "development" })).toContain("NODE_ENV_MUST_BE_PRODUCTION");
  });
  it("rejects missing or cross-origin JWT configuration", () => {
    expect(sandboxReleaseIssues({ ...ready, AUTH_JWKS_URL: undefined })).toContain("JWT_SETTINGS_REQUIRED");
    expect(sandboxReleaseIssues({ ...ready, AUTH_JWKS_URL: "https://evil.example.com/keys" })).toContain("JWT_ENDPOINTS_INVALID");
    expect(sandboxReleaseIssues({ ...ready, AUTH_JWKS_URL: "http://project.supabase.co/auth/v1/.well-known/jwks.json" })).toContain("JWT_ENDPOINTS_INVALID");
  });
  it("does not include any password, DSN or secret values in release errors", () => {
    try {
      assertSandboxReleaseReady({ ...ready, DATABASE_URL: "sqlite://secret-password" });
      throw new Error("expected gate failure");
    } catch (e) {
      expect((e as Error).message).not.toContain("secret-password");
      expect((e as Error).message).toContain("PERSISTENT_POSTGRES_REQUIRED");
    }
  });
});
