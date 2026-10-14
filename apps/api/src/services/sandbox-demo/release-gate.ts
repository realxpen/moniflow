/**
 * Safe to show to operators: this validator returns only setting NAMES,
 * never connection strings, JWT settings values or API credentials.
 */
export type SandboxReleaseConfig = {
  NODE_ENV: "development" | "test" | "production";
  DATABASE_URL: string;
  AUTH_ISSUER?: string;
  AUTH_JWKS_URL?: string;
  AUTH_AUDIENCE: string;
};

export function sandboxReleaseIssues(config: SandboxReleaseConfig): string[] {
  const issues: string[] = [];
  if (config.NODE_ENV !== "production") issues.push("NODE_ENV_MUST_BE_PRODUCTION");
  if (!/^postgres(?:ql)?:\/\//i.test(config.DATABASE_URL)) issues.push("PERSISTENT_POSTGRES_REQUIRED");
  if (!config.AUTH_ISSUER || !config.AUTH_JWKS_URL || !config.AUTH_AUDIENCE.trim()) {
    issues.push("JWT_SETTINGS_REQUIRED");
  } else {
    try {
      const issuer = new URL(config.AUTH_ISSUER);
      const jwks = new URL(config.AUTH_JWKS_URL);
      if (issuer.protocol !== "https:" || jwks.protocol !== "https:" ||
          issuer.origin !== jwks.origin ||
          !jwks.pathname.startsWith(issuer.pathname.replace(/\/$/, "") + "/") ||
          issuer.username || issuer.password || jwks.username || jwks.password) {
        issues.push("JWT_ENDPOINTS_INVALID");
      }
    } catch {
      issues.push("JWT_ENDPOINTS_INVALID");
    }
  }
  return issues;
}

export function assertSandboxReleaseReady(config: SandboxReleaseConfig) {
  const issues = sandboxReleaseIssues(config);
  if (issues.length) {
    throw new Error("SANDBOX_RELEASE_CONFIGURATION_BLOCKED: " + issues.join(","));
  }
}
