import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";

import type { ActivityRepository, FinancialActivity } from "./activity.js";

export async function ensureActivitySchema(sql: Sql) {
  await sql`alter table moniflow_private.activities add column if not exists source text not null default 'internal'`;
  await sql`
    create unique index if not exists activities_reference_once_idx
    on moniflow_private.activities(local_user_id, kind, reference)
    where reference is not null
  `;
}

export class PostgresActivityRepository implements ActivityRepository {
  constructor(private readonly sql: Sql) {}

  async list(localUserId: string, limit = 50): Promise<FinancialActivity[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const rows = await this.sql`
      select id, local_user_id, kind, status, amount, currency, reference, source, metadata, created_at
      from moniflow_private.activities where local_user_id = ${localUserId}::uuid order by created_at desc limit ${safeLimit}
    `;
    return rows.map(mapRow);
  }

  async recordOnce(input: Omit<FinancialActivity, "id" | "createdAt">) {
    const rows = await this.sql`
      insert into moniflow_private.activities (id, local_user_id, kind, status, amount, currency, reference, source, metadata)
      values (
        ${randomUUID()}::uuid, ${input.localUserId}::uuid, ${input.kind}, ${input.status}, ${input.amount}, ${input.currency},
        ${input.reference}, ${input.source}, ${JSON.stringify(input.metadata)}::jsonb
      )
      on conflict (local_user_id, kind, reference) where reference is not null do nothing
      returning id, local_user_id, kind, status, amount, currency, reference, source, metadata, created_at
    `;
    if (rows[0]) return { activity: mapRow(rows[0]), created: true };

    const existing = await this.sql`
      select id, local_user_id, kind, status, amount, currency, reference, source, metadata, created_at
      from moniflow_private.activities
      where local_user_id = ${input.localUserId}::uuid and kind = ${input.kind} and reference = ${input.reference}
      limit 1
    `;
    if (!existing[0]) throw new Error("Activity upsert produced no row.");
    return { activity: mapRow(existing[0]), created: false };
  }

  async close() {}
}

function mapRow(row: any): FinancialActivity {
  return {
    id: String(row.id),
    localUserId: String(row.local_user_id),
    kind: String(row.kind),
    status: String(row.status),
    amount: row.amount === null ? null : Number(row.amount),
    currency: row.currency === null ? null : String(row.currency),
    reference: String(row.reference),
    source: row.source === "provider" ? "provider" : "internal",
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: new Date(row.created_at).toISOString()
  };
}
