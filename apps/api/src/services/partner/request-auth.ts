import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";
import type { FastifyRequest } from "fastify";

import type { PartnerOperationStore } from "./operation-store.js";

export const PARTNER_MEDIA_TYPE = "application/vnd.moniflow.partner+json";
const MAX_SKEW_MS = 5 * 60 * 1000;
const signatureSchema = z.string().regex(/^sha256=[0-9a-f]{64}$/);
const nonceSchema = z.uuid();

export function signPartnerRequest(
  secret: string,
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  payload: Buffer
) {
  const digest = createHash("sha256").update(payload).digest("hex");
  const canonical = [method.toUpperCase(),path,timestamp,nonce,digest].join("\n");
  return "sha256=" + createHmac("sha256", secret).update(canonical).digest("hex");
}

/** Identity is determined by the configured partner secret, never by body UUIDs. */
export async function authenticatePartner(
  request: FastifyRequest,
  store: PartnerOperationStore,
  secret: string,
  now = Date.now()
): Promise<"ok" | "unauthorized" | "replay"> {
  const partner = request.headers["x-moniflow-partner"];
  const signedAt = request.headers["x-moniflow-timestamp"];
  const nonce = request.headers["x-moniflow-nonce"];
  const signature = request.headers["x-moniflow-signature"];
  if (
    partner !== "HUSTLE" ||
    typeof signedAt !== "string" ||
    typeof nonce !== "string" ||
    typeof signature !== "string" ||
    !nonceSchema.safeParse(nonce).success ||
    !signatureSchema.safeParse(signature).success
  ) return "unauthorized";

  const timestamp = Number(signedAt);
  if (!/^\d{13}$/.test(signedAt) || !Number.isSafeInteger(timestamp) ||
      Math.abs(now - timestamp) > MAX_SKEW_MS) return "unauthorized";

  const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
  if (request.method === "POST" && !Buffer.isBuffer(request.body)) return "unauthorized";
  if (rawBody.length > 16_384) return "unauthorized";

  const expected = signPartnerRequest(secret, request.method, request.raw.url ?? "",
    signedAt, nonce, rawBody);
  const supplied = Buffer.from(signature, "utf8");
  const known = Buffer.from(expected, "utf8");
  if (known.length !== supplied.length || !timingSafeEqual(known,supplied)) return "unauthorized";

  // Replay prevention is persisted in the database so app restarts do not
  // permit an old signed command to execute again.
  return (await store.claimNonce("HUSTLE", nonce, timestamp)) ? "ok" : "replay";
}
