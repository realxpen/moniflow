import { describe, expect, it } from "vitest";
import {
  partnerIdentifierSchema,
  partnerFinancialCommandSchema,
  partnerFinancialEventSchema
} from "./partner-contracts.js";

const id = "e124bfd4-4fa0-4718-872e-93aa3dff1a13";
const other = "547763f8-d8c5-4762-b9a3-ed7a3228d563";

const collection = {
  version: "1" as const,
  partner: "HUSTLE" as const,
  environment: "sandbox" as const,
  operationId: id,
  idempotencyKey: "hustle:payment:1",
  kind: "COLLECTION" as const,
  subjectType: "BOOKING" as const,
  subjectId: other,
  payerReference: id,
  beneficiaryReference: other,
  amountMinor: 1_000_000,
  currency: "NGN" as const
};

describe("Hustle partner financial contract v1 (no external operations)", () => {
  it("accepts actual Hustle CUID record references while rejecting malformed identifiers", () => {
    const cuid = "cmq8h5rjk0000n91t32g77v4p";
    expect(partnerIdentifierSchema.safeParse(cuid).success).toBe(true);
    expect(partnerFinancialCommandSchema.safeParse({ ...collection, operationId:cuid, subjectId:cuid, payerReference:cuid, beneficiaryReference:cuid }).success).toBe(true);
    expect(partnerIdentifierSchema.safeParse("../danger").success).toBe(false);
  });
  it("accepts a strictly specified sandbox collection", () => {
    expect(partnerFinancialCommandSchema.parse(collection).amountMinor).toBe(1_000_000);
  });

  it("rejects non-integer, zero, negative and unsafe monetary amounts", () => {
    for (const amountMinor of [0, -2, 0.23, Number.MAX_SAFE_INTEGER + 1]) {
      expect(partnerFinancialCommandSchema.safeParse({ ...collection, amountMinor }).success).toBe(false);
    }
  });

  it("does not allow arbitrary environment, currency, or injected fields", () => {
    for (const change of [
      { environment: "production" },
      { currency: "USD" },
      { partner: "OTHER" },
      { providerSuccessful: true },
      { subjectType: "PAYOUT" }
    ]) {
      expect(partnerFinancialCommandSchema.safeParse({ ...collection, ...change }).success).toBe(false);
    }
  });

  it("requires a prior Hustle reservation and a verified payout destination reference", () => {
    const payout = {
      version: "1", partner: "HUSTLE", environment: "sandbox",
      operationId: id, idempotencyKey: "hustle:payout:1",
      kind: "PAYOUT", payoutId: id, beneficiaryReference: other,
      destinationReference: "destination:123", hustleReservationReference: "ledger:123",
      amountMinor: 1000, currency: "NGN"
    };
    expect(partnerFinancialCommandSchema.safeParse(payout).success).toBe(true);
    const { hustleReservationReference: _ignored, ...missing } = payout;
    expect(partnerFinancialCommandSchema.safeParse(missing).success).toBe(false);
  });

  it("rejects success without independently retrievable provider evidence", () => {
    const event = {
      version: "1", partner: "HUSTLE", environment: "sandbox",
      eventId: id, operationId: other, kind: "COLLECTION",
      status: "SUCCEEDED", provider: "moniflow-sandbox",
      providerOperationReference: "mf-op-1",
      amountMinor: 1000, currency: "NGN",
      providerEvidenceReference: null,
      simulated: true, occurredAt: "2026-10-13T09:00:00+01:00"
    };
    expect(partnerFinancialEventSchema.safeParse(event).success).toBe(false);
    expect(partnerFinancialEventSchema.safeParse({
      ...event, providerEvidenceReference: "simulation-receipt:1"
    }).success).toBe(true);
  });
});
