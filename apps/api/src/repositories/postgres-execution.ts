import type { Sql } from "postgres";
import { z } from "zod";

import type { ExecutionRepository, ProviderExecution, PreparationHold, PreparationHoldInput, PreparationHoldState, SpendablePreparationInput, SpendableClaimResult } from "./execution.js";
import { moneyInCents } from "./execution.js";

const rowSchema = z.object({
  plan_id: z.string(), local_user_id: z.string(), provider_proposal_id: z.string(), provider_bank_account_id: z.string(),
  amount: z.coerce.number(), currency: z.literal("NGN"), sign_hash: z.string().nullable(), provider_status: z.string().nullable(),
  state: z.enum(["PREPARING", "AWAITING_DEVICE_SIGNATURE", "PROCESSING", "COMPLETED", "FAILED"]),
  created_at: z.coerce.string(), updated_at: z.coerce.string()
});
const holdRowSchema = z.object({
  plan_id: z.string(), local_user_id: z.string(), approved_plan_hash: z.string(),
  provider_bank_account_id: z.string(), amount: z.coerce.number(),
  state: z.enum(["RESERVED", "PROVIDER_OUTCOME_UNKNOWN", "PROPOSAL_RECORDED"]),
  provider_proposal_id: z.string().nullable(), created_at: z.coerce.string(), updated_at: z.coerce.string()
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
  // Durable, cross-process idempotency fence created BEFORE any provider
  // proposal submission. A crashed attempt stays reserved permanently.
  await sql`
    create table if not exists moniflow_private.provider_preparation_holds_v1 (
      plan_id uuid primary key references moniflow_private.money_plans(id) on delete cascade,
      local_user_id uuid not null,
      approved_plan_hash text not null check(length(approved_plan_hash) = 64),
      provider_bank_account_id text not null,
      amount numeric(20,2) not null check (amount > 0),
      state text not null check (state in ('RESERVED','PROVIDER_OUTCOME_UNKNOWN','PROPOSAL_RECORDED')),
      provider_proposal_id text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists provider_preparation_holds_owner_v1
    on moniflow_private.provider_preparation_holds_v1(local_user_id, created_at desc)`;
  await sql`alter table moniflow_private.provider_preparation_holds_v1
    add column if not exists reserved_amount numeric(20,2)`;
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

  async claimPreparation(value: PreparationHoldInput): Promise<boolean> {
    const rows = await this.sql`
      insert into moniflow_private.provider_preparation_holds_v1 (
        plan_id, local_user_id, approved_plan_hash, provider_bank_account_id,
        amount, state, provider_proposal_id
      ) values (
        ${value.planId}::uuid, ${value.localUserId}::uuid, ${value.approvedPlanHash},
        ${value.providerBankAccountId}, ${value.amount}, 'RESERVED', null
      )
      on conflict (plan_id) do nothing
      returning plan_id
    `;
    return rows.length === 1;
  }

  async claimSpendablePreparation(input: SpendablePreparationInput): Promise<SpendableClaimResult> {
    const requestedCents = moneyInCents(input.reservedAmount);
    const ceilingCents = moneyInCents(input.spendableCeiling);
    if (requestedCents === 0 || input.reservedAmount < input.amount) {
      throw new Error("The plan must reserve its entire positive commitment.");
    }
    return this.sql.begin(async (tx): Promise<SpendableClaimResult> => {
      // Deterministic owner lock serializes independent app instances and
      // distinct plan IDs under the SAME wallet spending capacity.
      await tx`select pg_advisory_xact_lock(hashtextextended(${input.localUserId}::text, 324801))`;
      const rows = await tx`
        select count(*) filter (where reserved_amount is null)::integer as legacy_count,
               coalesce(sum(reserved_amount), 0)::text as reserved_total
        from moniflow_private.provider_preparation_holds_v1
        where local_user_id = ${input.localUserId}::uuid
      `;
      if (Number(rows[0]?.legacy_count ?? 0) > 0) return "UNRECONCILED_LEGACY";
      if (moneyInCents(Number(rows[0]?.reserved_total ?? "0")) + requestedCents > ceilingCents) {
        return "INSUFFICIENT_CAPACITY";
      }
      const inserted = await tx`
        insert into moniflow_private.provider_preparation_holds_v1 (
          plan_id, local_user_id, approved_plan_hash, provider_bank_account_id,
          amount, reserved_amount, state, provider_proposal_id
        ) values (
          ${input.planId}::uuid, ${input.localUserId}::uuid,
          ${input.approvedPlanHash}, ${input.providerBankAccountId},
          ${input.amount}, ${input.reservedAmount}, 'RESERVED', null
        )
        on conflict (plan_id) do nothing returning plan_id
      `;
      return inserted.length === 1 ? "CLAIMED" : "CONFLICT";
    });
  }

  async findPreparationHold(planId: string, localUserId: string): Promise<PreparationHold | null> {
    const rows = await this.sql`
      select plan_id, local_user_id, approved_plan_hash, provider_bank_account_id,
             amount, state, provider_proposal_id, created_at, updated_at
      from moniflow_private.provider_preparation_holds_v1
      where plan_id = ${planId}::uuid and local_user_id = ${localUserId}::uuid
      limit 1
    `;
    if (!rows[0]) return null;
    const row = holdRowSchema.parse(rows[0]);
    return {
      planId: row.plan_id, localUserId: row.local_user_id,
      approvedPlanHash: row.approved_plan_hash, providerBankAccountId: row.provider_bank_account_id,
      amount: row.amount, state: row.state, providerProposalId: row.provider_proposal_id,
      createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString()
    };
  }

  async recordPreparationOutcome(
    planId: string, localUserId: string,
    state: Exclude<PreparationHoldState, "RESERVED">, proposalId: string | null = null
  ): Promise<void> {
    // Never make a claimed plan available for a second provider submission.
    await this.sql`
      update moniflow_private.provider_preparation_holds_v1
      set state = ${state}, provider_proposal_id = ${proposalId}, updated_at = now()
      where plan_id = ${planId}::uuid and local_user_id = ${localUserId}::uuid
        and state = 'RESERVED'
    `;
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
