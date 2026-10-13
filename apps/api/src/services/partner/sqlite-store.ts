import { DatabaseSync } from "node:sqlite";

import type { PartnerFinancialCommand } from "@moniflow/shared";

import {
  type PartnerOperation,
  type PartnerOperationStore,
  type RecordedOperation,
  reconcileExistingOperation
} from "./operation-store.js";

export class SqlitePartnerOperationStore implements PartnerOperationStore {
  readonly ready = Promise.resolve();
  private readonly db: DatabaseSync;

  constructor(databaseUrl: string) {
    if (databaseUrl !== ":memory:" && !databaseUrl.startsWith("file:")) {
      throw new Error("Partner SQLite database requires file: or :memory:");
    }
    this.db = new DatabaseSync(databaseUrl === ":memory:" ? ":memory:" : databaseUrl.slice(5));
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS hustle_partner_nonces_v1 (" +
      "partner TEXT NOT NULL, nonce TEXT NOT NULL, ts INTEGER NOT NULL," +
      "PRIMARY KEY(partner,nonce)) STRICT;" +
      "CREATE TABLE IF NOT EXISTS hustle_partner_operations_v1 (" +
      "partner TEXT NOT NULL, operation_id TEXT NOT NULL, idempotency_key TEXT NOT NULL," +
      "kind TEXT NOT NULL, request_digest TEXT NOT NULL, command_json TEXT NOT NULL," +
      "state TEXT NOT NULL CHECK(state='RECEIVED'), created_at TEXT NOT NULL," +
      "PRIMARY KEY(partner,operation_id), UNIQUE(partner,idempotency_key)) STRICT;"
    );
  }

  async claimNonce(partner: "HUSTLE", nonce: string, timestamp: number) {
    const written = this.db.prepare(
      "INSERT OR IGNORE INTO hustle_partner_nonces_v1 (partner,nonce,ts) VALUES (?,?,?)"
    ).run(partner, nonce, timestamp);
    return written.changes === 1;
  }

  async record(command: PartnerFinancialCommand, digest: string): Promise<RecordedOperation> {
    const now = new Date().toISOString();
    const written = this.db.prepare(
      "INSERT OR IGNORE INTO hustle_partner_operations_v1 " +
      "(partner,operation_id,idempotency_key,kind,request_digest,command_json,state,created_at)" +
      " VALUES (?,?,?,?,?,?,'RECEIVED',?)"
    ).run(command.partner, command.operationId, command.idempotencyKey,
      command.kind, digest, JSON.stringify(command), now);

    const byOperation = this.getBy("operation_id", command.partner, command.operationId);
    if (written.changes === 1 && byOperation) return { operation: byOperation, duplicate: false };
    const byKey = this.getBy("idempotency_key", command.partner, command.idempotencyKey);
    return reconcileExistingOperation(command, digest, byOperation, byKey);
  }

  async find(partner: "HUSTLE", operationId: string) {
    return this.getBy("operation_id", partner, operationId);
  }

  private getBy(field: "operation_id" | "idempotency_key", partner: "HUSTLE", value: string): PartnerOperation | null {
    // field is selected from a fixed literal union; values are always bound.
    const row = this.db.prepare(
      "SELECT * FROM hustle_partner_operations_v1 WHERE partner=? AND " + field + "=? LIMIT 1"
    ).get(partner, value) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      partner: "HUSTLE",
      operationId: String(row.operation_id),
      idempotencyKey: String(row.idempotency_key),
      kind: String(row.kind) as PartnerOperation["kind"],
      requestDigest: String(row.request_digest),
      command: JSON.parse(String(row.command_json)) as PartnerFinancialCommand,
      state: "RECEIVED",
      createdAt: String(row.created_at)
    };
  }
  async close() { this.db.close(); }
}
