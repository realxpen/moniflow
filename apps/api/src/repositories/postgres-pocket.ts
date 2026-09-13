import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";

import type { PlanPocketAllocation, Pocket, PocketRepository } from "./pocket.js";

export async function ensurePocketSchema(sql: Sql) {
  await sql`
    create table if not exists moniflow_private.pocket_plan_allocations (
      plan_id uuid not null references moniflow_private.money_plans(id) on delete cascade,
      action_index integer not null,
      local_user_id uuid not null references moniflow_private.bmoni_user_mappings(local_user_id) on delete cascade,
      pocket_id uuid not null references moniflow_private.pockets(id) on delete cascade,
      amount numeric(20,2) not null check (amount > 0),
      created_at timestamptz not null default now(),
      primary key(plan_id, action_index)
    )
  `;
}

export class PostgresPocketRepository implements PocketRepository {
  constructor(private readonly sql: Sql) {}

  async list(localUserId: string): Promise<Pocket[]> {
    const rows = await this.sql`
      select id, local_user_id, name, target_amount, allocated_amount, currency, created_at, updated_at
      from moniflow_private.pockets where local_user_id = ${localUserId}::uuid order by created_at asc
    `;
    return rows.map(mapRow);
  }

  async create(input: { localUserId: string; name: string; targetAmount?: number | null }): Promise<Pocket> {
    const rows = await this.sql`
      insert into moniflow_private.pockets (id, local_user_id, name, target_amount, allocated_amount, currency)
      values (${randomUUID()}::uuid, ${input.localUserId}::uuid, ${input.name}, ${input.targetAmount ?? null}, 0, 'NGN')
      on conflict (local_user_id, name) do update set name = excluded.name
      returning id, local_user_id, name, target_amount, allocated_amount, currency, created_at, updated_at
    `;
    return mapRow(rows[0]!);
  }

  async applyPlanAllocation(input: PlanPocketAllocation) {
    let result: Pocket | null = null;
    let applied = false;

    await this.sql.begin(async (tx) => {
      const existing = await tx`
        select p.id, p.local_user_id, p.name, p.target_amount, p.allocated_amount, p.currency, p.created_at, p.updated_at
        from moniflow_private.pocket_plan_allocations a
        join moniflow_private.pockets p on p.id = a.pocket_id
        where a.plan_id = ${input.planId}::uuid and a.action_index = ${input.actionIndex}
        limit 1
      `;
      if (existing[0]) {
        result = mapRow(existing[0]);
        return;
      }

      const pocketRows = await tx`
        insert into moniflow_private.pockets (id, local_user_id, name, target_amount, allocated_amount, currency)
        values (${randomUUID()}::uuid, ${input.localUserId}::uuid, ${input.name}, null, 0, 'NGN')
        on conflict (local_user_id, name) do update set name = excluded.name
        returning id, local_user_id, name, target_amount, allocated_amount, currency, created_at, updated_at
      `;
      const pocket = mapRow(pocketRows[0]!);
      await tx`
        insert into moniflow_private.pocket_plan_allocations (plan_id, action_index, local_user_id, pocket_id, amount)
        values (${input.planId}::uuid, ${input.actionIndex}, ${input.localUserId}::uuid, ${pocket.id}::uuid, ${input.amount})
      `;
      const updatedRows = await tx`
        update moniflow_private.pockets set allocated_amount = allocated_amount + ${input.amount}, updated_at = now()
        where id = ${pocket.id}::uuid
        returning id, local_user_id, name, target_amount, allocated_amount, currency, created_at, updated_at
      `;
      result = mapRow(updatedRows[0]!);
      applied = true;
    });

    if (!result) throw new Error("Pocket allocation transaction produced no pocket.");
    return { pocket: result, applied };
  }

  async totalAllocated(localUserId: string): Promise<number> {
    const rows = await this.sql`
      select coalesce(sum(allocated_amount), 0)::text as total from moniflow_private.pockets where local_user_id = ${localUserId}::uuid
    `;
    return Number(rows[0]?.total ?? 0);
  }

  async close() {}
}

function mapRow(row: any): Pocket {
  return {
    id: String(row.id),
    localUserId: String(row.local_user_id),
    name: String(row.name),
    targetAmount: row.target_amount === null ? null : Number(row.target_amount),
    allocatedAmount: Number(row.allocated_amount),
    currency: "NGN",
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}
