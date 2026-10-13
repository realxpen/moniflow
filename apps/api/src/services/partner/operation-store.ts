import type { PartnerFinancialCommand } from "@moniflow/shared";

export type PartnerOperation = {
  partner: "HUSTLE";
  operationId: string;
  idempotencyKey: string;
  kind: "COLLECTION" | "PAYOUT" | "REFUND";
  requestDigest: string;
  command: PartnerFinancialCommand;
  state: "RECEIVED";
  createdAt: string;
};
export type RecordedOperation = { operation: PartnerOperation; duplicate: boolean };

export class PartnerCommandConflictError extends Error {
  constructor() { super("An operation ID or idempotency key is bound to different terms"); }
}

export interface PartnerOperationStore {
  ready: Promise<void>;
  /** Atomic, persistent nonce insert; returned false means replay. */
  claimNonce(partner: "HUSTLE", nonce: string, timestamp: number): Promise<boolean>;
  /** Tenant-bound atomic operation-id and idempotency uniqueness. */
  record(command: PartnerFinancialCommand, digest: string): Promise<RecordedOperation>;
  find(partner: "HUSTLE", operationId: string): Promise<PartnerOperation | null>;
  close(): Promise<void>;
}

export function reconcileExistingOperation(
  command: PartnerFinancialCommand,
  digest: string,
  byOperation: PartnerOperation | null,
  byKey: PartnerOperation | null
): RecordedOperation {
  if (
    !byOperation || !byKey ||
    byOperation.operationId !== byKey.operationId ||
    byOperation.operationId !== command.operationId ||
    byOperation.idempotencyKey !== command.idempotencyKey ||
    byOperation.requestDigest !== digest ||
    byOperation.partner !== command.partner
  ) {
    throw new PartnerCommandConflictError();
  }
  return { operation: byOperation, duplicate: true };
}
