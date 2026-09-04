import type { Sql } from "postgres";
import { z } from "zod";

import type { ExecutionRepository, ProviderExecution } from "./execution.js";

const rowSchema = z.object({
  plan_id: z.string(), local_user_id: z.string(), provider_proposal_id: z.string(), provider_bank_account_id: z.string(),
  amount: z.coerce.number(), currency: z.literal("NGN"), sign_hash: z.string().nullable(), provider_status: z.string().nullable(),
  state: z.enum(["PREPARING", "AWAITING_DEVICE_SIGNATURE", "PROCESSING", "COMPLETED", "FAILED"]),
  created_at: z.coerce.string(), updated_at: z.coerce.string()
});

export async function ensureExecutionSchema(sql: Sql) {
  await sql`
    create table if not exists moniflow_private.provider_executions (
      plan_id uuid primary key references moniflow_private.money_plans(id) on delete cascade,
      local_user_id uuid not null references moniflow_private.bmoni_user_mappings(local_user_id) on delete cascade,
      provider_proposal_id text not null unique,
      provider_bank_account_id text not null,
      amount numeric(20,2) not null check (amount > 0),
      currency text not null check (currency = 'NGN'),
      sign_hash text,
      provider_status text,
      state text not null check (state in ('PREPARING','AWAITING_DEVICE_SIGNATURE','PROCESSING','COMPLETED','FAILED')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists provider_executions_local_user_idx on moniflow_private.provider_executions(local_user_id, created_at desc)`;
}

export class PostgresExecutionRepository implements ExecutionRepository {
  constructor(private readonly sql: Sql) {}

  async findByPlanId(planId: string, localUserId: string): Promise<ProviderExecution | null> {
    const rows = await this.sql`
      select plan_id, local_user_id, provider_proposal_id, provider_bank_account_id, amount, currency,
             sign_hash, provider_status, state, created_at, updated_at
      from moniflow_private.provider_executions
      where plan_id = ${planId}::uuid and local_user_id = ${localUserId}::uuid
      limit 1
    `;
    return rows[0] ? mapRow(rowSchema.parse(rows[0])) : null;
  }

  async create(value: ProviderExecution): Promise<ProviderExecution> {
    await this.sql`
      insert into moniflow_private.provider_executions (
        plan_id, local_user_id, provider_proposal_id, provider_bank_account_id, amount, currency,
        sign_hash, provider_status, state, created_at, updated_at
      ) values (
        ${value.planId}::uuid, ${value.localUserId}::uuid, ${value.providerProposalId}, ${value.providerBankAccountId},
        ${value.amount}, ${value.currency}, ${value.signHash}, ${value.providerStatus}, ${value.state},
        ${value.createdAt}::timestamptz, ${value.updatedAt}::timestamptz
      )
    `;
    const saved = await this.findByPlanId(value.planId, value.localUserId);
    if (!saved) throw new Error("Provider execution could not be reloaded.");
    return saved;
  }

  async update(value: ProviderExecution): Promise<ProviderExecution> {
    await this.sql`
      update moniflow_private.provider_executions
      set provider_bank_account_id = ${value.providerBankAccountId}, amount = ${value.amount}, currency = ${value.currency},
          sign_hash = ${value.signHash}, provider_status = ${value.providerStatus}, state = ${value.state}, updated_at = ${value.updatedAt}::timestamptz
      where plan_id = ${value.planId}::uuid and local_user_id = ${value.localUserId}::uuid and provider_proposal_id = ${value.providerProposalId}
    `;
    const saved = await this.findByPlanId(value.planId, value.localUserId);
    if (!saved) throw new Error("Provider execution could not be reloaded.");
    return saved;
  }

  async close() {}
}

function mapRow(row: z.infer<typeof rowSchema>): ProviderExecution {
  return {
    planId: row.plan_id, localUserId: row.local_user_id, providerProposalId: row.provider_proposal_id,
    providerBankAccountId: row.provider_bank_account_id, amount: row.amount, currency: row.currency,
    signHash: row.sign_hash, providerStatus: row.provider_status, state: row.state,
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString()
  };
}
