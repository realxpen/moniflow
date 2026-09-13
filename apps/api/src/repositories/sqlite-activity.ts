import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";

import type { ActivityRepository, FinancialActivity } from "./activity.js";

const rowSchema = z.object({
  id: z.string(),
  local_user_id: z.string(),
  kind: z.string(),
  status: z.string(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  reference: z.string(),
  source: z.enum(["provider", "internal"]),
  metadata_json: z.string(),
  created_at: z.string()
});

function databaseFilename(databaseUrl: string) {
  if (databaseUrl === ":memory:") return databaseUrl;
  if (!databaseUrl.startsWith("file:")) throw new Error("SQLite DATABASE_URL must use file: or :memory:.");
  return databaseUrl.slice("file:".length);
}

export class SqliteActivityRepository implements ActivityRepository {
  private readonly database: DatabaseSync;

  constructor(databaseUrl: string) {
    this.database = new DatabaseSync(databaseFilename(databaseUrl));
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS activities_phase15 (
        id TEXT PRIMARY KEY,
        local_user_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        status TEXT NOT NULL,
        amount REAL,
        currency TEXT,
        reference TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('provider','internal')),
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        UNIQUE(local_user_id, kind, reference)
      ) STRICT;
    `);
  }

  async list(localUserId: string, limit = 50): Promise<FinancialActivity[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const rows = this.database.prepare(`
      SELECT * FROM activities_phase15 WHERE local_user_id = ? ORDER BY created_at DESC LIMIT ?
    `).all(localUserId, safeLimit);
    return rows.map((row) => mapRow(rowSchema.parse(row)));
  }

  async recordOnce(input: Omit<FinancialActivity, "id" | "createdAt">) {
    const existing = this.database.prepare(`
      SELECT * FROM activities_phase15 WHERE local_user_id = ? AND kind = ? AND reference = ? LIMIT 1
    `).get(input.localUserId, input.kind, input.reference);
    if (existing) return { activity: mapRow(rowSchema.parse(existing)), created: false };

    const activity: FinancialActivity = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    this.database.prepare(`
      INSERT INTO activities_phase15 (id, local_user_id, kind, status, amount, currency, reference, source, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      activity.id,
      activity.localUserId,
      activity.kind,
      activity.status,
      activity.amount,
      activity.currency,
      activity.reference,
      activity.source,
      JSON.stringify(activity.metadata),
      activity.createdAt
    );
    return { activity, created: true };
  }

  async close() { this.database.close(); }
}

function mapRow(row: z.infer<typeof rowSchema>): FinancialActivity {
  return {
    id: row.id,
    localUserId: row.local_user_id,
    kind: row.kind,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    reference: row.reference,
    source: row.source,
    metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
    createdAt: row.created_at
  };
}
