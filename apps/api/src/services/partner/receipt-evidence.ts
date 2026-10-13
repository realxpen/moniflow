import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import type { PartnerOperation } from "./operation-store.js";

const cuidOrUuid = z.union([z.uuid(), z.string().regex(/^c[a-z0-9]{20,34}$/)]);
export const partnerReceiptEventSchema = z.object({
  version: z.literal("1"),
  source: z.literal("MONIFLOW"),
  partner: z.literal("HUSTLE"),
  environment: z.literal("sandbox"),
  eventType: z.literal("operation.received"),
  eventId: z.string().regex(/^moniflow\.received:(?:[a-f0-9-]{36}|c[a-z0-9]{20,34})$/),
  operationId: cuidOrUuid,
  kind: z.enum(["COLLECTION", "PAYOUT", "REFUND"]),
  amountMinor: z.number().int().positive().safe(),
  currency: z.literal("NGN"),
  commandDigest: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.literal("RECEIVED"),
  simulated: z.literal(true),
  executionStarted: z.literal(false),
  realFundsMoved: z.literal(false),
  providerEvidenceReference: z.null(),
  occurredAt: z.iso.datetime({offset:true})
}).strict();

export function makeReceiptEvent(operation: PartnerOperation): z.infer<typeof partnerReceiptEventSchema> {
  return partnerReceiptEventSchema.parse({
    version:"1", source:"MONIFLOW", partner:operation.partner, environment:"sandbox",
    eventType:"operation.received", eventId:`moniflow.received:${operation.operationId}`,
    operationId:operation.operationId, kind:operation.kind,
    amountMinor:operation.command.amountMinor, currency:operation.command.currency,
    commandDigest:operation.requestDigest, status:"RECEIVED",
    simulated:true, executionStarted:false, realFundsMoved:false,
    providerEvidenceReference:null, occurredAt:operation.createdAt
  });
}

/** Domain-separated signed receipt; no external payment provider evidence. */
export function signReceiptEvidence(secret: string, rawBody: Buffer) {
  if (secret.length < 32) throw new Error("RECEIPT_SECRET_INVALID");
  return "sha256="+createHmac("sha256",secret)
    .update("MONIFLOW_SANDBOX_RECEIPT_V1\n")
    .update(rawBody).digest("hex");
}

export function verifyReceiptEvidence(secret: string, rawBody: Buffer, signature: string) {
  if (!/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const known=Buffer.from(signReceiptEvidence(secret,rawBody));
  const given=Buffer.from(signature);
  return known.length===given.length && timingSafeEqual(known,given);
}
