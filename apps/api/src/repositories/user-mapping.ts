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
  state: "PROVIDER_USER_EXISTS" | "PROVIDER_OUTCOME_UNKNOWN";
  createdAt: string;
};

/**
 * Permanent, manual-review-only hold. A 409 or ambiguous create-user result
 * must not cause another POST /v1/users, even after a process restart.
 */
export interface UserMappingRepository {
  findByEmail(email: string): Promise<UserMapping | null>;
  findByLocalUserId(localUserId: string): Promise<UserMapping | null>;
  save(mapping: UserMapping): Promise<UserMapping>;
  findHoldByEmail(email: string): Promise<UserProvisioningHold | null>;
  createHold(hold: UserProvisioningHold): Promise<UserProvisioningHold>;
  /**
   * Unique atomic reservation BEFORE any provider create call.
   * Returns false if this email or localUserId was already reserved.
   */
  reserveBeforeCreate(hold: UserProvisioningHold): Promise<boolean>;
  markProviderUserExists(email: string): Promise<void>;
  close(): Promise<void>;
}
