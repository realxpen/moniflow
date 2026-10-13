import { z } from "zod";

/**
 * Proposed MONIFlow Partner Contract v1 — LOCAL/SANDBOX SPECIFICATION ONLY.
 * No route, financial operation or BMONI API endpoint is implemented here.
 *
 * Hustle owns merchant amounts, entitlement, ledger and escrow.
 * MONIFlow owns the provider operation coordination, not custody claims.
 */
const uuid = z.uuid();
const amountMinor = z.number().int().positive().safe();
const currency = z.literal("NGN");
const reference = z.string().trim().min(1).max(160);
const partner = z.literal("HUSTLE");
const sandboxEnvironment = z.literal("sandbox");
const version = z.literal("1");

export const partnerOperationEnvelopeSchema = z.object({
  version,
  partner,
  environment: sandboxEnvironment,
  operationId: uuid,
  idempotencyKey: reference,
  // Authenticated service principal must be resolved separately from this untrusted body.
}).strict();

export const partnerCollectionCommandSchema = partnerOperationEnvelopeSchema.extend({
  kind: z.literal("COLLECTION"),
  subjectType: z.enum(["BOOKING", "ORDER"]),
  subjectId: uuid,
  payerReference: uuid,
  beneficiaryReference: uuid,
  amountMinor,
  currency
}).strict();

export const partnerPayoutCommandSchema = partnerOperationEnvelopeSchema.extend({
  kind: z.literal("PAYOUT"),
  payoutId: uuid,
  beneficiaryReference: uuid,
  // Opaque identifier for a verified, partner-bound payout destination.
  destinationReference: reference,
  amountMinor,
  currency,
  // Hustle must first commit a matching durable AVAILABLE -> PAYOUT_RESERVED
  // ledger movement and signed human withdrawal authorization.
  hustleReservationReference: reference
}).strict();

export const partnerRefundCommandSchema = partnerOperationEnvelopeSchema.extend({
  kind: z.literal("REFUND"),
  refundId: uuid,
  originalPaymentReference: reference,
  subjectType: z.enum(["BOOKING", "ORDER"]),
  subjectId: uuid,
  amountMinor,
  currency,
  // Hustle must persist refund eligibility/restriction before dispatch.
  hustleRefundAuthorizationReference: reference
}).strict();

export const partnerFinancialCommandSchema = z.discriminatedUnion("kind", [
  partnerCollectionCommandSchema,
  partnerPayoutCommandSchema,
  partnerRefundCommandSchema
]);

export const partnerExecutionStateSchema = z.enum([
  "RECEIVED",
  "PREPARING",
  "AWAITING_AUTHORIZATION",
  "AWAITING_DEVICE_SIGNATURE",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "UNKNOWN"
]);

/**
 * An event may report an execution state, but it does not by itself authorize
 * Hustle domain transitions. Hustle verifies authenticity and independently
 * reconciles authoritative provider evidence for SUCCEEDED/FAILED.
 */
export const partnerFinancialEventSchema = z.object({
  version,
  partner,
  environment: sandboxEnvironment,
  eventId: uuid,
  operationId: uuid,
  kind: z.enum(["COLLECTION", "PAYOUT", "REFUND"]),
  status: partnerExecutionStateSchema,
  provider: reference,
  providerOperationReference: reference,
  amountMinor,
  currency,
  providerEvidenceReference: reference.nullable(),
  simulated: z.boolean(),
  occurredAt: z.iso.datetime({ offset: true }),
}).strict().superRefine((data, ctx) => {
  if (data.status === "SUCCEEDED" && !data.providerEvidenceReference) {
    ctx.addIssue({
      code: "custom",
      path: ["providerEvidenceReference"],
      message: "Successful events require an evidence reference, including sandbox simulation receipts"
    });
  }
});

export type PartnerFinancialCommand = z.infer<typeof partnerFinancialCommandSchema>;
export type PartnerFinancialEvent = z.infer<typeof partnerFinancialEventSchema>;
export type PartnerFinancialExecutionState = z.infer<typeof partnerExecutionStateSchema>;
