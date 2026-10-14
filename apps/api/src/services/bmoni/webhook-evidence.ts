import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

/**
 * Official partner-scoped BMONI names, NOT the unscoped legacy wallet.* names.
 * See https://embedded-docs.bmoni.com/api-reference/webhooks/
 */
const eventTypeSchema = z.enum([
  "employee.deposit.completed",
  "employee.deposit.failed",
  "employee.deposit.refunded",
  "employee.withdrawal.processing",
  "employee.withdrawal.completed",
  "employee.withdrawal.failed"
]);

const envelopeSchema = z.object({
  id: z.string().trim().min(1).max(200),
  eventType: eventTypeSchema,
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.iso.datetime({ offset: true })
}).strict();

export type BmoniEvidence = {
  eventId: string;
  eventType: z.infer<typeof eventTypeSchema>;
  sourceEventId: string | null;
  bodyDigest: string;
  occurredAt: string;
};

/**
 * Accept only an explicit test secret; the BMONI docs specify an unprefixed
 * 64-character hex secretKey and hex digest over EXACT raw bytes.
 * Interpret the secret as the UTF-8 string, as in the official Node example.
 */
export function verifySandboxBmoniWebhook(
  rawBody: Buffer,
  signature: string | undefined,
  webhookId: string | undefined,
  sourceEventId: string | undefined,
  secretKey: string
): BmoniEvidence {
  if (process.env.NODE_ENV !== "test") throw new Error("BMONI_WEBHOOK_TEST_ONLY");
  if (!/^[0-9a-f]{64}$/i.test(secretKey)) throw new Error("INVALID_BMONI_TEST_SECRET");
  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0 || rawBody.length > 64 * 1024) {
    throw new Error("INVALID_BMONI_RAW_BODY");
  }
  if (!signature || !/^[0-9a-f]{64}$/.test(signature)) throw new Error("INVALID_BMONI_SIGNATURE");
  const expected = createHmac("sha256", secretKey).update(rawBody).digest("hex");
  if (!timingSafeEqual(Buffer.from(signature, "ascii"), Buffer.from(expected, "ascii"))) {
    throw new Error("INVALID_BMONI_SIGNATURE");
  }

  let parsed: unknown;
  try { parsed = JSON.parse(rawBody.toString("utf8")) as unknown; }
  catch { throw new Error("INVALID_BMONI_ENVELOPE"); }
  const event = envelopeSchema.safeParse(parsed);
  if (!event.success) throw new Error("INVALID_BMONI_ENVELOPE");
  if (!webhookId || webhookId !== event.data.id) throw new Error("BMONI_EVENT_ID_MISMATCH");
  if (sourceEventId && (sourceEventId.length > 200 || /[\x00-\x1f]/.test(sourceEventId))) {
    throw new Error("INVALID_BMONI_SOURCE_EVENT_ID");
  }
  return {
    eventId: event.data.id,
    eventType: event.data.eventType,
    sourceEventId: sourceEventId || null,
    bodyDigest: createHash("sha256").update(rawBody).digest("hex"),
    occurredAt: event.data.timestamp
  };
}
