export type UserMapping = {
  bmoniUserId: string;
  createdAt: string;
  email: string;
  localUserId: string;
  updatedAt: string;
};

export type UserProvisioningHold = {
  email: string;
  localUserId: string | null;
  /** Server-keyed HMAC-SHA256; null only for pre-upgrade/manual legacy holds. */
  phoneFingerprint?: string | null;
  state: "PROVIDER_USER_EXISTS" | "PROVIDER_OUTCOME_UNKNOWN";
  createdAt: string;
};

/**
 * Permanent, manual-review-only hold. A 409 or ambiguous create-user result
 * must not cause another POST /v1/users, even after a process restart.
 */
export interface UserMappingRepository {
  /** Fail closed before ANY user mapping read or new provider dispatch if the
   * server fingerprint key differs from the one that established these holds.
   * Never auto-adopt a new key over existing fingerprinted rows.
   */
  assertPhoneKeyContinuity(guardDigest: string): Promise<void>;
  findByEmail(email: string): Promise<UserMapping | null>;
  findByLocalUserId(localUserId: string): Promise<UserMapping | null>;
  save(mapping: UserMapping): Promise<UserMapping>;
  findHoldByEmail(email: string): Promise<UserProvisioningHold | null>;
  findHoldByPhoneFingerprint(fingerprint: string): Promise<UserProvisioningHold | null>;
  createHold(hold: UserProvisioningHold): Promise<UserProvisioningHold>;
  /**
   * Unique atomic reservation BEFORE any provider create call.
   * Returns false if this email or localUserId was already reserved.
   */
  reserveBeforeCreate(hold: UserProvisioningHold): Promise<boolean>;
  markProviderUserExists(email: string): Promise<void>;
  close(): Promise<void>;
}
