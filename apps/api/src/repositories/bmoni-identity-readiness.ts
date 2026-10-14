import { timingSafeEqual } from "node:crypto";

import type { BmoniIdentityReadinessSnapshot } from "./user-mapping.js";

/**
 * Internal aggregate view. A matched key does NOT authorize BMONI onboarding,
 * wallets, payouts, provider success, custody or real customer funds.
 */
export function classifyBmoniIdentityReadiness(input: {
  mappingCount: number;
  providerExistsHoldCount: number;
  unknownOutcomeHoldCount: number;
  fingerprintedHoldCount: number;
  legacyUnfingerprintedHoldCount: number;
  storedGuardDigest: string | null;
  expectedGuardDigest?: string;
}): BmoniIdentityReadinessSnapshot {
  const counts = [
    input.mappingCount,
    input.providerExistsHoldCount,
    input.unknownOutcomeHoldCount,
    input.fingerprintedHoldCount,
    input.legacyUnfingerprintedHoldCount
  ];
  if (!counts.every(n=>Number.isSafeInteger(n) && n>=0)) {
    throw new Error("BMONI_READINESS_CORRUPT_COUNTS");
  }

  let keyContinuity: BmoniIdentityReadinessSnapshot["keyContinuity"];
  if (!input.expectedGuardDigest || !/^[a-f0-9]{64}$/.test(input.expectedGuardDigest)) {
    keyContinuity="SECRET_NOT_CONFIGURED";
  } else if (!input.storedGuardDigest) {
    keyContinuity=input.fingerprintedHoldCount>0 ? "UNMARKED_LEGACY" : "NOT_ENROLLED";
  } else if (!/^[a-f0-9]{64}$/.test(input.storedGuardDigest)) {
    keyContinuity="MISMATCH";
  } else {
    const a=Buffer.from(input.storedGuardDigest,"ascii");
    const b=Buffer.from(input.expectedGuardDigest,"ascii");
    keyContinuity=timingSafeEqual(a,b)?"MATCH":"MISMATCH";
  }

  return {
    mappingCount:input.mappingCount,
    providerExistsHoldCount:input.providerExistsHoldCount,
    unknownOutcomeHoldCount:input.unknownOutcomeHoldCount,
    fingerprintedHoldCount:input.fingerprintedHoldCount,
    legacyUnfingerprintedHoldCount:input.legacyUnfingerprintedHoldCount,
    keyContinuity,
    manualReviewRequired:
      input.providerExistsHoldCount>0 || input.unknownOutcomeHoldCount>0 ||
      input.legacyUnfingerprintedHoldCount>0 ||
      (keyContinuity!=="MATCH" && keyContinuity!=="NOT_ENROLLED"),
    providerUserRecoveryConfirmed:false,
    providerFinancialExecutionAllowed:false
  };
}
