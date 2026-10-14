import "dotenv/config";

import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  value === "" ? undefined : value;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Required for public production financial routes: Supabase Auth issuer + asymmetric JWKS.
  AUTH_ISSUER: z.preprocess(emptyStringToUndefined, z.url().optional()),
  AUTH_JWKS_URL: z.preprocess(emptyStringToUndefined, z.url().optional()),
  AUTH_AUDIENCE: z.string().default("authenticated"),
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().max(65_535).default(4_000),
  // Public website origins only. Comma-separated, exact browser Origin matches; never "*" in production.
  CORS_ALLOWED_ORIGINS: z.string().default([
    "https://moniflow-indol.vercel.app",
    "https://moniflow-swifnatechnologyltd.vercel.app",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:19006",
    "http://localhost:3000"
  ].join(",")),
  FINANCIAL_PROVIDER: z.enum(["bmoni", "moniflow-sandbox"]).default("bmoni"),
  BMONI_BASE_URL: z.preprocess(
    emptyStringToUndefined,
    z.url().optional()
  ),
  BMONI_API_KEY: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional()
  ),
  // Never enable with only BMONI's shared sandbox key. Requires partner approval.
  BMONI_PARTNER_ONBOARDING_ENABLED: z.enum(["true", "false"]).default("false"),
  // Test fixture webhook only: never subscribe real provider callbacks.
  BMONI_WEBHOOK_EVIDENCE_TEST_ENABLED: z.enum(["true", "false"]).default("false"),
  BMONI_WEBHOOK_EVIDENCE_TEST_SECRET: z.preprocess(
    emptyStringToUndefined, z.string().regex(/^[0-9a-fA-F]{64}$/).optional()
  ),
  BMONI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().max(30_000).default(10_000),
  DATABASE_URL: z.string().default("file:./moniflow.db"),
  // Explicit, non-production, simulated partner control plane only.
  PARTNER_HUSTLE_SANDBOX_ENABLED: z.enum(["true","false"]).default("false"),
  PARTNER_HUSTLE_HMAC_SECRET: z.preprocess(
    emptyStringToUndefined, z.string().min(32).optional()
  )
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const fields = parsedEnv.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid server environment configuration: ${fields}`);
}

export const env = Object.freeze(parsedEnv.data);
