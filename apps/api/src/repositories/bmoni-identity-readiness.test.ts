import { describe,expect,it } from "vitest";

import { classifyBmoniIdentityReadiness } from "./bmoni-identity-readiness.js";

const guard="a".repeat(64);
const base={
  mappingCount:0,providerExistsHoldCount:0,unknownOutcomeHoldCount:0,
  fingerprintedHoldCount:0,legacyUnfingerprintedHoldCount:0,
  storedGuardDigest:null,expectedGuardDigest:guard
};

describe("B2 read-only readiness decisions",()=>{
  it("reports uninitialized clean databases without inventing provider authorization",()=>{
    const r=classifyBmoniIdentityReadiness(base);
    expect(r.keyContinuity).toBe("NOT_ENROLLED");
    expect(r.manualReviewRequired).toBe(false);
    expect(r.providerUserRecoveryConfirmed).toBe(false);
    expect(r.providerFinancialExecutionAllowed).toBe(false);
  });
  it("reports unresolved 409/unknown and legacy phone rows without identifiers",()=>{
    const r=classifyBmoniIdentityReadiness({
      ...base,providerExistsHoldCount:2,unknownOutcomeHoldCount:3,
      fingerprintedHoldCount:4,legacyUnfingerprintedHoldCount:1
    });
    expect(r).toMatchObject({
      keyContinuity:"UNMARKED_LEGACY",manualReviewRequired:true,
      providerFinancialExecutionAllowed:false
    });
    expect(JSON.stringify(r)).not.toContain(guard);
  });
  it("distinguishes key missing, rotated and matched while never returning marker hashes",()=>{
    const good=classifyBmoniIdentityReadiness({
      ...base,storedGuardDigest:guard,expectedGuardDigest:guard
    });
    expect(good.keyContinuity).toBe("MATCH");
    expect(classifyBmoniIdentityReadiness({
      ...base,storedGuardDigest:guard,expectedGuardDigest:"b".repeat(64)
    }).keyContinuity).toBe("MISMATCH");
    expect(classifyBmoniIdentityReadiness({
      ...base,storedGuardDigest:guard,expectedGuardDigest:undefined
    }).keyContinuity).toBe("SECRET_NOT_CONFIGURED");
    expect(JSON.stringify(good)).not.toContain(guard);
  });
  it("rejects malformed count data rather than showing a false ready state",()=>{
    expect(()=>classifyBmoniIdentityReadiness({...base,unknownOutcomeHoldCount:-1}))
      .toThrow("BMONI_READINESS_CORRUPT_COUNTS");
    expect(()=>classifyBmoniIdentityReadiness({...base,mappingCount:Infinity}))
      .toThrow("BMONI_READINESS_CORRUPT_COUNTS");
  });
});
