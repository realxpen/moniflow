import { DatabaseSync } from "node:sqlite";
import postgres, { type Sql } from "postgres";

import type { BmoniEvidence } from "./webhook-evidence.js";

export type EvidenceObservationResult = { duplicate: boolean; eventId: string };
export interface BmoniEvidenceStore {
  record(value: BmoniEvidence): Promise<EvidenceObservationResult>;
  count(): Promise<number>;
  close(): Promise<void>;
}

/** Observations are NOT provider settlement, merchant collection or refund proof. */
export class SqliteBmoniEvidenceStore implements BmoniEvidenceStore {
  private readonly db: DatabaseSync;
  constructor(databaseUrl: string) {
    if (databaseUrl !== ":memory:" && !databaseUrl.startsWith("file:")) {
      throw new Error("BMONI evidence SQLite needs file: or :memory:");
    }
    this.db = new DatabaseSync(databaseUrl === ":memory:" ? ":memory:" : databaseUrl.slice(5));
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bmoni_sandbox_webhook_observations_v1 (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        source_event_id TEXT,
        body_digest TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        evidence_kind TEXT NOT NULL DEFAULT 'TEST_OBSERVATION'
          CHECK (evidence_kind='TEST_OBSERVATION')
      ) STRICT
    `);
  }
  async record(value: BmoniEvidence) {
    const inserted = this.db.prepare(`
      INSERT OR IGNORE INTO bmoni_sandbox_webhook_observations_v1
        (event_id,event_type,source_event_id,body_digest,occurred_at,observed_at)
      VALUES (?,?,?,?,?,?)
    `).run(value.eventId,value.eventType,value.sourceEventId,value.bodyDigest,
      value.occurredAt,new Date().toISOString());
    const found = this.db.prepare(`
      SELECT event_type,source_event_id,body_digest,occurred_at
      FROM bmoni_sandbox_webhook_observations_v1 WHERE event_id=? LIMIT 1
    `).get(value.eventId) as Record<string, unknown> | undefined;
    if (!found || found.event_type !== value.eventType ||
        found.source_event_id !== value.sourceEventId ||
        found.body_digest !== value.bodyDigest ||
        found.occurred_at !== value.occurredAt) {
      throw new Error("BMONI_EVENT_CONFLICT");
    }
    return { duplicate: inserted.changes === 0, eventId: value.eventId };
  }
  async count() {
    const row = this.db.prepare(
      "SELECT COUNT(*) AS n FROM bmoni_sandbox_webhook_observations_v1"
    ).get() as { n: number };
    return row.n;
  }
  async close(){this.db.close();}
}

export class PostgresBmoniEvidenceStore implements BmoniEvidenceStore {
  private readonly sql: Sql;
  private readonly ready: Promise<void>;
  constructor(databaseUrl:string) {
    if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error("Invalid BMONI evidence Postgres URL");
    this.sql = postgres(databaseUrl, { max: 3, prepare: false, connect_timeout: 10 });
    this.ready = this.ensure();
    void this.ready.catch(()=>undefined);
  }
  private async ensure(){
    await this.sql`CREATE SCHEMA IF NOT EXISTS moniflow_private`;
    await this.sql`REVOKE ALL ON SCHEMA moniflow_private FROM public`;
    await this.sql`CREATE TABLE IF NOT EXISTS moniflow_private.bmoni_sandbox_webhook_observations_v1 (
      event_id text PRIMARY KEY,
      event_type text NOT NULL,
      source_event_id text,
      body_digest text NOT NULL,
      occurred_at timestamptz NOT NULL,
      observed_at timestamptz NOT NULL DEFAULT now(),
      evidence_kind text NOT NULL DEFAULT 'TEST_OBSERVATION'
        CHECK (evidence_kind='TEST_OBSERVATION')
    )`;
  }
  async record(value:BmoniEvidence) {
    await this.ready;
    const inserted=await this.sql`
      INSERT INTO moniflow_private.bmoni_sandbox_webhook_observations_v1
        (event_id,event_type,source_event_id,body_digest,occurred_at)
      VALUES (${value.eventId},${value.eventType},${value.sourceEventId},
        ${value.bodyDigest},${value.occurredAt}::timestamptz)
      ON CONFLICT DO NOTHING RETURNING event_id
    `;
    const rows=await this.sql`
      SELECT event_type,source_event_id,body_digest,occurred_at
      FROM moniflow_private.bmoni_sandbox_webhook_observations_v1
      WHERE event_id=${value.eventId} LIMIT 1
    `;
    const found=rows[0];
    if (!found || found.event_type!==value.eventType ||
        found.source_event_id!==value.sourceEventId ||
        found.body_digest!==value.bodyDigest ||
        new Date(String(found.occurred_at)).getTime() !== new Date(value.occurredAt).getTime()) {
      throw new Error("BMONI_EVENT_CONFLICT");
    }
    return { duplicate:inserted.length===0,eventId:value.eventId };
  }
  async count(){
    await this.ready;
    const rows=await this.sql`
      SELECT COUNT(*)::integer AS n FROM moniflow_private.bmoni_sandbox_webhook_observations_v1
    `;
    return Number(rows[0]?.n??0);
  }
  async close(){await this.sql.end({timeout:5});}
}
