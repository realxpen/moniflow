import { createHmac } from "node:crypto";

import { BmoniConfigurationError } from "./errors.js";

/**
 * Pseudonymous deterministic lock key. No phone is stored in the hold table.
 * This MUST use one stable 32+ character server-side secret across instances.
 * Losing/rotating it requires a reviewed migration; never silently fall back
 * to plain SHA256 (phone numbers have a small brute-force search space).
 */
export function phoneIdentityFingerprint(phoneNumber: string, key: string | undefined): string {
  if (!key || key.length < 32) {
    throw new BmoniConfigurationError("BMONI_IDENTITY_PHONE_HMAC_SECRET must be configured before user creation.");
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
    throw new Error("BMONI_PHONE_NOT_E164");
  }
  return createHmac("sha256", key)
    .update("MONIFLOW_BMONI_PHONE_LOCK_V1\n")
    .update(phoneNumber, "utf8")
    .digest("hex");
}
