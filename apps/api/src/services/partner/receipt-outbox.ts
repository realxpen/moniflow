import { DatabaseSync } from "node:sqlite";
import postgres, { type Sql } from "postgres";

export type ClaimedReceipt = { operationId: string; attempts: number };
export interface ReceiptOutbox {
  sync(): Promise<void>;
  claim(now?: number): Promise<ClaimedReceipt | null>;
  delivered(operationId: string): Promise<void>;
  retryLater(operationId: string, now?: number): Promise<void>;
  close(): Promise<void>;
}
/**
 * Durable RECEIVED-only notification delivery outbox. No provider operations.
 * All rows can be rebuilt from persisted, immutable partner commands after a
 * crash between command commit and enqueue. A lease permits safe at-least-once
 * redelivery; the Hustle inbox is responsible for idempotent observation.
 */
export class SqliteReceiptOutbox implements ReceiptOutbox {
  private readonly db: DatabaseSync;
  constructor(databaseUrl: string) {
    if (databaseUrl!==":memory:" && !databaseUrl.startsWith("file:")) {
      throw new Error("Invalid sandbox SQLite path");
    }
    this.db=new DatabaseSync(databaseUrl===":memory:" ? ":memory:" : databaseUrl.slice(5));
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS hustle_partner_receipt_outbox_v1 ("+
      "partner TEXT NOT NULL DEFAULT 'HUSTLE',operation_id TEXT NOT NULL,"+
      "state TEXT NOT NULL DEFAULT 'WAITING' CHECK(state IN ('WAITING','DELIVERED','DEAD')),"+
      "attempts INTEGER NOT NULL DEFAULT 0,lease_until INTEGER NOT NULL DEFAULT 0,"+
      "next_after INTEGER NOT NULL DEFAULT 0,"+
      "PRIMARY KEY(partner,operation_id)) STRICT;"
    );
  }
  async sync() {
    this.db.prepare(
      "INSERT OR IGNORE INTO hustle_partner_receipt_outbox_v1 (partner,operation_id) "+
      "SELECT partner,operation_id FROM hustle_partner_operations_v1 WHERE partner='HUSTLE'"
    ).run();
  }
  async claim(now=Date.now()): Promise<ClaimedReceipt|null> {
    const row=this.db.prepare(
      "UPDATE hustle_partner_receipt_outbox_v1 SET "+
      "lease_until=?,attempts=attempts+1 "+
      "WHERE rowid=(SELECT rowid FROM hustle_partner_receipt_outbox_v1 "+
      "WHERE partner='HUSTLE' AND state='WAITING' AND next_after<=? "+
      "AND lease_until<=? ORDER BY rowid LIMIT 1) "+
      "RETURNING operation_id,attempts"
    ).get(now+30_000,now,now) as Record<string,unknown>|undefined;
    return row?{operationId:String(row.operation_id),attempts:Number(row.attempts)}:null;
  }
  async delivered(operationId:string) {
    this.db.prepare("UPDATE hustle_partner_receipt_outbox_v1 SET state='DELIVERED',lease_until=0 "+
      "WHERE partner='HUSTLE' AND operation_id=? AND state='WAITING'").run(operationId);
  }
  async retryLater(operationId:string,now=Date.now()) {
    this.db.prepare("UPDATE hustle_partner_receipt_outbox_v1 "+
      "SET lease_until=0,next_after=?,state=CASE WHEN attempts>=8 THEN 'DEAD' ELSE 'WAITING' END "+
      "WHERE partner='HUSTLE' AND operation_id=? AND state='WAITING'"
    ).run(now+1000,operationId);
  }
  async close(){this.db.close();}
}

export class PostgresReceiptOutbox implements ReceiptOutbox {
  private readonly sql:Sql;
  private readonly ready:Promise<void>;
  constructor(databaseUrl:string) {
    this.sql=postgres(databaseUrl,{max:3,prepare:false,connect_timeout:10});
    this.ready=this.ensure();
    void this.ready.catch(()=>undefined);
  }
  private async ensure() {
    await this.sql`CREATE SCHEMA IF NOT EXISTS moniflow_private`;
    await this.sql`CREATE TABLE IF NOT EXISTS moniflow_private.hustle_partner_receipt_outbox_v1 (
      partner text NOT NULL DEFAULT 'HUSTLE' CHECK(partner='HUSTLE'),
      operation_id text NOT NULL,
      state text NOT NULL DEFAULT 'WAITING' CHECK(state IN ('WAITING','DELIVERED','DEAD')),
      attempts integer NOT NULL DEFAULT 0,
      lease_until bigint NOT NULL DEFAULT 0,
      next_after bigint NOT NULL DEFAULT 0,
      PRIMARY KEY(partner,operation_id)
    )`;
  }
  async sync() {
    await this.ready;
    await this.sql`INSERT INTO moniflow_private.hustle_partner_receipt_outbox_v1(partner,operation_id)
      SELECT partner,operation_id FROM moniflow_private.hustle_partner_operations_v1
      WHERE partner='HUSTLE'
      ON CONFLICT DO NOTHING`;
  }
  async claim(now=Date.now()):Promise<ClaimedReceipt|null> {
    await this.ready;
    const rows=await this.sql`WITH picked AS (
      SELECT partner,operation_id FROM moniflow_private.hustle_partner_receipt_outbox_v1
      WHERE partner='HUSTLE' AND state='WAITING' AND next_after<=${now}
        AND lease_until<=${now}
      ORDER BY operation_id LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    UPDATE moniflow_private.hustle_partner_receipt_outbox_v1 AS q
    SET lease_until=${now+30_000},attempts=q.attempts+1
    FROM picked WHERE q.partner=picked.partner AND q.operation_id=picked.operation_id
    RETURNING q.operation_id,q.attempts`;
    return rows[0]?{operationId:String(rows[0].operation_id),attempts:Number(rows[0].attempts)}:null;
  }
  async delivered(operationId:string) {
    await this.ready;
    await this.sql`UPDATE moniflow_private.hustle_partner_receipt_outbox_v1
      SET state='DELIVERED',lease_until=0
      WHERE partner='HUSTLE' AND operation_id=${operationId} AND state='WAITING'`;
  }
  async retryLater(operationId:string,now=Date.now()) {
    await this.ready;
    await this.sql`UPDATE moniflow_private.hustle_partner_receipt_outbox_v1
      SET lease_until=0,next_after=${now+1000},
      state=CASE WHEN attempts>=8 THEN 'DEAD' ELSE 'WAITING' END
      WHERE partner='HUSTLE' AND operation_id=${operationId} AND state='WAITING'`;
  }
  async close(){await this.sql.end({timeout:5});}
}
