import { describe, expect, it } from "vitest";

import { phoneIdentityFingerprint } from "./phone-identity-fingerprint.js";

const KEY="only-for-tests-stable-private-fingerprint-secret";

describe("BMONI phone identity fingerprint",()=>{
  it("is stable, keyed, domain-separated and does not store raw E164 phone",()=>{
    const a=phoneIdentityFingerprint("+2348012345678",KEY);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(phoneIdentityFingerprint("+2348012345678",KEY));
    expect(a).not.toContain("2348012345678");
    expect(a).not.toBe(phoneIdentityFingerprint("+2348012345678",KEY+"rotated"));
    expect(a).not.toBe(phoneIdentityFingerprint("+2348012345679",KEY));
  });
  it("refuses absent/weak secret and invalid phone formats without fallback",()=>{
    expect(()=>phoneIdentityFingerprint("+2348012345678",undefined)).toThrow(
      "BMONI_IDENTITY_PHONE_HMAC_SECRET"
    );
    expect(()=>phoneIdentityFingerprint("+2348012345678","weak")).toThrow(
      "BMONI_IDENTITY_PHONE_HMAC_SECRET"
    );
    expect(()=>phoneIdentityFingerprint("08012345678",KEY)).toThrow("BMONI_PHONE_NOT_E164");
  });
});
