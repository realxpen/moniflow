import "dotenv/config";

import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  value === "" ? undefined : value;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().max(65_535).default(4_000),
  BMONI_BASE_URL: z.preprocess(
    emptyStringToUndefined,
    z.url().optional()
  ),
  BMONI_API_KEY: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional()
  ),
  DATABASE_URL: z.string().default("file:./moniflow.db")
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const fields = parsedEnv.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid server environment configuration: ${fields}`);
}

export const env = Object.freeze(parsedEnv.data);
