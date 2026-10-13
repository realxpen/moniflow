import postgres, { type Sql } from "postgres";

import type { PartnerFinancialCommand } from "@moniflow/shared";

import {
  type PartnerOperation, type PartnerOperationStore, type RecordedOperation,
  reconcileExistingOperation
} from "./operation-store.js";

export class PostgresPartnerOperationStore implements PartnerOperationStore {
  readonly ready: Promise<void>;
  private readonly sql: Sql;
  constructor(databaseUrl: string) {
    if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error("Invalid partner Postgres DATABASE_URL");
    this.sql = postgres(databaseUrl, { max: 4, prepare: false, connect_timeout: 10 });
    this.ready = this.ensureSchema();
    void this.ready.catch(() => undefined);
  }

  private async ensureSchema() {
    await this.sql`CREATE SCHEMA IF NOT EXISTS moniflow_private`;
    await this.sql`REVOKE ALL ON SCHEMA moniflow_private FROM public`;
    await this.sql`
      CREATE TABLE IF NOT EXISTS moniflow_private.hustle_partner_nonces_v1 (
        partner text NOT NULL CHECK(partner='HUSTLE'),
        nonce uuid NOT NULL,
        ts bigint NOT NULL,
        PRIMARY KEY(partner,nonce)
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS moniflow_private.hustle_partner_operations_v1 (
        partner text NOT NULL CHECK(partner='HUSTLE'),
        operation_id text NOT NULL,
        idempotency_key text NOT NULL,
        kind text NOT NULL CHECK(kind IN ('COLLECTION','PAYOUT','REFUND')),
        request_digest text NOT NULL,
        command_json jsonb NOT NULL,
        state text NOT NULL DEFAULT 'RECEIVED' CHECK(state='RECEIVED'),
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY(partner,operation_id),
        UNIQUE(partner,idempotency_key)
      )
    `;
  }

  async claimNonce(partner: "HUSTLE", nonce: string, timestamp: number) {
    await this.ready;
    const rows = await this.sql`
      INSERT INTO moniflow_private.hustle_partner_nonces_v1(partner,nonce,ts)
      VALUES (${partner},${nonce}::uuid,${timestamp})
      ON CONFLICT DO NOTHING RETURNING nonce
    `;
    return rows.length === 1;
  }

  async record(command: PartnerFinancialCommand, digest: string): Promise<RecordedOperation> {
    await this.ready;
    const rows = await this.sql`
      INSERT INTO moniflow_private.hustle_partner_operations_v1
        (partner,operation_id,idempotency_key,kind,request_digest,command_json,state)
      VALUES (${command.partner},${command.operationId},${command.idempotencyKey},
        ${command.kind},${digest},${JSON.stringify(command)}::jsonb,'RECEIVED')
      ON CONFLICT DO NOTHING RETURNING operation_id
    `;
    const byOperation = await this.find(command.partner, command.operationId);
    if (rows.length === 1 && byOperation) return { operation: byOperation, duplicate: false };
    const byKey = await this.findByKey(command.partner, command.idempotencyKey);
    return reconcileExistingOperation(command, digest, byOperation, byKey);
  }

  async find(partner: "HUSTLE", operationId: string) {
    await this.ready;
    const rows=await this.sql`
      SELECT * FROM moniflow_private.hustle_partner_operations_v1
      WHERE partner=${partner} AND operation_id=${operationId} LIMIT 1
    `;
    return rows[0] ? this.mapRow(rows[0] as Record<string, unknown>) : null;
  }

  private async findByKey(partner: "HUSTLE", key: string) {
    const rows=await this.sql`
      SELECT * FROM moniflow_private.hustle_partner_operations_v1
      WHERE partner=${partner} AND idempotency_key=${key} LIMIT 1
    `;
    return rows[0] ? this.mapRow(rows[0] as Record<string, unknown>) : null;
  }

  private mapRow(row: Record<string, unknown>): PartnerOperation {
    return {
      partner: "HUSTLE",
      operationId: String(row.operation_id),
      idempotencyKey: String(row.idempotency_key),
      kind: String(row.kind) as PartnerOperation["kind"],
      requestDigest: String(row.request_digest),
      command: row.command_json as PartnerFinancialCommand,
      state: "RECEIVED",
      createdAt: new Date(String(row.created_at)).toISOString()
    };
  }
  async close() { await this.sql.end({ timeout: 5 }); }
}
