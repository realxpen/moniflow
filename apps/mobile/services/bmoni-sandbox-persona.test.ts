import { describe, expect, it } from "vitest";
import {
  BMONI_SANDBOX_PERSONAS, assertDocumentedSandboxPersona, getSandboxPersona,
  matchesDocumentedSandboxPersona
} from "./bmoni-sandbox-persona";

describe("BMONI published Nigeria sandbox test personas", () => {
  it("recognizes exactly the two official identities without merging fields", () => {
    expect(BMONI_SANDBOX_PERSONAS).toHaveLength(2);
    for (const persona of BMONI_SANDBOX_PERSONAS) {
      expect(matchesDocumentedSandboxPersona(persona)).toBe(true);
      expect(getSandboxPersona(persona.id)).toBe(persona);
      expect(() => assertDocumentedSandboxPersona(persona)).not.toThrow();
    }
  });

  it("blocks the old UI mismatch (sample identity mixed with Samson test BVN)", () => {
    expect(() => assertDocumentedSandboxPersona({
      firstName: "Chiamaka", lastName: "Okafor", phoneNumber: "+2348012345678", bvn: "22222222222"
    })).toThrow("MISMATCH");
  });

  it("rejects mixing Bunch's identity with Samson's BVN or phone", () => {
    const bunch = getSandboxPersona("bunch");
    const samson = getSandboxPersona("samson");
    expect(matchesDocumentedSandboxPersona({ ...bunch, bvn: samson.bvn })).toBe(false);
    expect(matchesDocumentedSandboxPersona({ ...bunch, phoneNumber: samson.phoneNumber })).toBe(false);
    expect(matchesDocumentedSandboxPersona({ ...samson, firstName: "Bunch" })).toBe(false);
  });

  it("rejects arbitrary and personal identities in this shared sandbox onboarding flow", () => {
    const arbitrary = { firstName: "Example", lastName: "Person",
      phoneNumber: "+2348012345678", bvn: "11111111111" };
    expect(() => assertDocumentedSandboxPersona(arbitrary)).toThrow("MISMATCH");
  });
});
