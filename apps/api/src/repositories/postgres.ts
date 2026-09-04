import postgres, { type Sql } from "postgres";
import { z } from "zod";

import type { GuardCheck } from "@moniflow/moniguard";

import { moniflowIntentSchema } from "../schemas/intent.js";
import { moneyPlanSchema } from "../schemas/money-plan.js";
import type { CreatePersistedMoneyPlanInput, MoneyPlanRepository, PersistedMoneyPlan } from "./money-plan.js";
import type { UserMapping, UserMappingRepository } from "./user-mapping.js";
import type { WalletOwnership, WalletOwnershipRepository } from "./wallet-ownership.js";

const userRowSchema = z.object({
  local_user_id: z.string(), email: z.string(), bmoni_user_id: z.string(), created_at: z.coerce.string(), updated_at: z.coerce.string()
});
const walletRowSchema = z.object({
  local_user_id: z.string(), owner_address: z.string(), bmoni_smart_wallet_id: z.string(), smart_wallet_address: z.string(),
  currency: z.literal("CNGN"), created_at: z.coerce.string(), updated_at: z.coerce.string()
});
const moneyPlanRowSchema = z.object({
  id: z.string(), local_user_id: z.string(), original_instruction: z.string(), status: z.string(),
  intent_payload: z.unknown(), plan_payload: z.unknown(), guard_verdict: z.string().nullable(), plan_hash: z.string(),
  approved_plan_hash: z.string().nullable(), approved_at: z.coerce.string().nullable(), created_at: z.coerce.string(), updated_at: z.coerce.string()
});

export function createPostgresClient(databaseUrl: string) {
  return postgres(databaseUrl, { max: 5, prepare: false, idle_timeout: 20, connect_timeout: 10 });
}

export async function ensureMoniflowSchema(sql: Sql) {
  await sql`create schema if not exists moniflow_private`;
  await sql`revoke all on schema moniflow_private from public`;

  await sql`
    create table if not exists moniflow_private.bmoni_user_mappings (
      local_user_id uuid primary key,
      email text not null,
      bmoni_user_id text not null unique,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`create unique index if not exists bmoni_user_mappings_email_lower_idx on moniflow_private.bmoni_user_mappings (lower(email))`;

  await sql`
    create table if not exists moniflow_private.wallet_ownership (
      local_user_id uuid primary key references moniflow_private.bmoni_user_mappings(local_user_id) on delete cascade,
      owner_address text not null,
      bmoni_smart_wallet_id text not null unique,
      smart_wallet_address text not null unique,
      currency text not null check (currency = 'CNGN'),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists moniflow_private.bank_accounts (
      id uuid primary key default gen_random_uuid(),
      local_user_id uuid not null references moniflow_private.bmoni_user_mappings(local_user_id) on delete cascade,
      provider_account_id text not null unique,
      bank_code text not null,
      bank_name text not null,
      masked_account_number text not null,
      account_holder_name text not null,
      verified boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists bank_accounts_local_user_idx on moniflow_private.bank_accounts(local_user_id)`;

  await sql`
    create table if not exists moniflow_private.pockets (
      id uuid primary key default gen_random_uuid(),
      local_user_id uuid not null references moniflow_private.bmoni_user_mappings(local_user_id) on delete cascade,
      name text not null,
      target_amount numeric(20,2),
      allocated_amount numeric(20,2) not null default 0 check (allocated_amount >= 0),
      currency text not null default 'NGN' check (currency = 'NGN'),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(local_user_id, name)
    )
  `;

  await sql`
    create table if not exists moniflow_private.money_plans (
      id uuid primary key default gen_random_uuid(),
      local_user_id uuid not null references moniflow_private.bmoni_user_mappings(local_user_id) on delete cascade,
      original_instruction text not null,
      source_intent text not null,
      currency text not null default 'NGN' check (currency = 'NGN'),
      current_available numeric(20,2) not null check (current_available >= 0),
      external_movement numeric(20,2) not null default 0 check (external_movement >= 0),
      internal_allocation numeric(20,2) not null default 0 check (internal_allocation >= 0),
      total_committed numeric(20,2) not null default 0 check (total_committed >= 0),
      available_after numeric(20,2) not null,
      requires_approval boolean not null,
      status text not null check (status in ('DRAFT','PARSING','VALIDATING','BLOCKED','AWAITING_USER_APPROVAL','APPROVED','EXECUTING','AWAITING_DEVICE_SIGNATURE','PROCESSING','COMPLETED','FAILED','CANCELLED')),
      guard_verdict text check (guard_verdict is null or guard_verdict in ('ALLOW','REVIEW','BLOCK')),
      plan_hash text not null,
      intent_payload jsonb not null,
      plan_payload jsonb not null,
      approved_plan_hash text,
      approved_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`alter table moniflow_private.money_plans add column if not exists original_instruction text`;
  await sql`alter table moniflow_private.money_plans add column if not exists guard_verdict text`;
  await sql`alter table moniflow_private.money_plans add column if not exists plan_hash text`;
  await sql`alter table moniflow_private.money_plans add column if not exists intent_payload jsonb`;
  await sql`alter table moniflow_private.money_plans add column if not exists plan_payload jsonb`;
  await sql`alter table moniflow_private.money_plans add column if not exists approved_plan_hash text`;
  await sql`alter table moniflow_private.money_plans add column if not exists approved_at timestamptz`;
  await sql`create index if not exists money_plans_local_user_created_idx on moniflow_private.money_plans(local_user_id, created_at desc)`;

  await sql`
    create table if not exists moniflow_private.plan_actions (
      id uuid primary key default gen_random_uuid(),
      plan_id uuid not null references moniflow_private.money_plans(id) on delete cascade,
      action_index integer not null check (action_index > 0),
      kind text not null,
      label text not null,
      description text not null,
      amount numeric(20,2) not null default 0 check (amount >= 0),
      movement text not null,
      requires_approval boolean not null default false,
      created_at timestamptz not null default now(),
      unique(plan_id, action_index)
    )
  `;

  await sql`
    create table if not exists moniflow_private.guard_checks (
      id uuid primary key default gen_random_uuid(),
      plan_id uuid not null references moniflow_private.money_plans(id) on delete cascade,
      rule text not null,
      passed boolean not null,
      severity text not null,
      message text,
      created_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists moniflow_private.activities (
      id uuid primary key default gen_random_uuid(),
      local_user_id uuid not null references moniflow_private.bmoni_user_mappings(local_user_id) on delete cascade,
      kind text not null,
      status text not null,
      amount numeric(20,2),
      currency text,
      reference text,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists activities_local_user_created_idx on moniflow_private.activities(local_user_id, created_at desc)`;
}

function iso(value: string) { return new Date(value).toISOString(); }

export class PostgresUserMappingRepository implements UserMappingRepository {
  constructor(private readonly sql: Sql) {}

  async findByEmail(email: string): Promise<UserMapping | null> {
    const rows = await this.sql`select local_user_id, email, bmoni_user_id, created_at, updated_at from moniflow_private.bmoni_user_mappings where lower(email) = lower(${email}) limit 1`;
    if (!rows[0]) return null;
    const row = userRowSchema.parse(rows[0]);
    return { localUserId: row.local_user_id, email: row.email, bmoniUserId: row.bmoni_user_id, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) };
  }

  async findByLocalUserId(localUserId: string): Promise<UserMapping | null> {
    const rows = await this.sql`select local_user_id, email, bmoni_user_id, created_at, updated_at from moniflow_private.bmoni_user_mappings where local_user_id = ${localUserId}::uuid limit 1`;
    if (!rows[0]) return null;
    const row = userRowSchema.parse(rows[0]);
    return { localUserId: row.local_user_id, email: row.email, bmoniUserId: row.bmoni_user_id, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) };
  }

  async save(mapping: UserMapping): Promise<UserMapping> {
    await this.sql`insert into moniflow_private.bmoni_user_mappings (local_user_id, email, bmoni_user_id, created_at, updated_at) values (${mapping.localUserId}::uuid, ${mapping.email}, ${mapping.bmoniUserId}, ${mapping.createdAt}::timestamptz, ${mapping.updatedAt}::timestamptz)`;
    return mapping;
  }

  async close() {}
}

export class PostgresWalletOwnershipRepository implements WalletOwnershipRepository {
  constructor(private readonly sql: Sql) {}

  async findByLocalUserId(localUserId: string): Promise<WalletOwnership | null> {
    const rows = await this.sql`select local_user_id, owner_address, bmoni_smart_wallet_id, smart_wallet_address, currency, created_at, updated_at from moniflow_private.wallet_ownership where local_user_id = ${localUserId}::uuid limit 1`;
    if (!rows[0]) return null;
    const row = walletRowSchema.parse(rows[0]);
    return { localUserId: row.local_user_id, ownerAddress: row.owner_address, bmoniSmartWalletId: row.bmoni_smart_wallet_id, smartWalletAddress: row.smart_wallet_address, currency: row.currency, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) };
  }

  async save(value: WalletOwnership): Promise<WalletOwnership> {
    await this.sql`
      insert into moniflow_private.wallet_ownership (local_user_id, owner_address, bmoni_smart_wallet_id, smart_wallet_address, currency, created_at, updated_at)
      values (${value.localUserId}::uuid, ${value.ownerAddress}, ${value.bmoniSmartWalletId}, ${value.smartWalletAddress}, ${value.currency}, ${value.createdAt}::timestamptz, ${value.updatedAt}::timestamptz)
      on conflict (local_user_id) do update set owner_address = excluded.owner_address, bmoni_smart_wallet_id = excluded.bmoni_smart_wallet_id,
        smart_wallet_address = excluded.smart_wallet_address, currency = excluded.currency, updated_at = excluded.updated_at
    `;
    return value;
  }

  async close() {}
}

export class PostgresMoneyPlanRepository implements MoneyPlanRepository {
  constructor(private readonly sql: Sql) {}

  async create(input: CreatePersistedMoneyPlanInput): Promise<PersistedMoneyPlan> {
    const rows = await this.sql`
      insert into moniflow_private.money_plans (
        local_user_id, original_instruction, source_intent, currency, current_available, external_movement,
        internal_allocation, total_committed, available_after, requires_approval, status, guard_verdict,
        plan_hash, intent_payload, plan_payload, approved_plan_hash, approved_at
      ) values (
        ${input.localUserId}::uuid, ${input.originalInstruction}, ${input.plan.sourceIntent}, ${input.plan.currency}, ${input.plan.currentAvailable},
        ${input.plan.totals.externalMovement}, ${input.plan.totals.internalAllocation}, ${input.plan.totals.totalCommitted},
        ${input.plan.totals.availableAfter}, ${input.plan.requiresApproval}, 'VALIDATING', null, ${input.planHash},
        ${JSON.stringify(input.intent)}::jsonb, ${JSON.stringify(input.plan)}::jsonb, null, null
      ) returning id
    `;
    const id = String(rows[0]?.id ?? "");
    for (const action of input.plan.actions) {
      await this.sql`
        insert into moniflow_private.plan_actions (plan_id, action_index, kind, label, description, amount, movement, requires_approval)
        values (${id}::uuid, ${action.index}, ${action.kind}, ${action.label}, ${action.description}, ${action.amount}, ${action.movement}, ${action.requiresApproval})
      `;
    }
    const stored = await this.findById(id, input.localUserId);
    if (!stored) throw new Error("Persisted Money Plan could not be reloaded.");
    return stored;
  }

  async findById(planId: string, localUserId: string): Promise<PersistedMoneyPlan | null> {
    const rows = await this.sql`
      select id, local_user_id, original_instruction, status, intent_payload, plan_payload,
             guard_verdict, plan_hash, approved_plan_hash, approved_at, created_at, updated_at
      from moniflow_private.money_plans where id = ${planId}::uuid and local_user_id = ${localUserId}::uuid limit 1
    `;
    if (!rows[0]) return null;
    return mapMoneyPlanRow(moneyPlanRowSchema.parse(rows[0]));
  }

  async recordGuard(
    planId: string,
    localUserId: string,
    verdict: "ALLOW" | "REVIEW" | "BLOCK",
    checks: GuardCheck[],
    currentPlanHash: string
  ): Promise<PersistedMoneyPlan | null> {
    const status = verdict === "BLOCK" ? "BLOCKED" : verdict === "REVIEW" ? "AWAITING_USER_APPROVAL" : "APPROVED";
    const approvedAt = verdict === "ALLOW" ? new Date().toISOString() : null;
    await this.sql.begin(async (transaction) => {
      await transaction`
        update moniflow_private.money_plans
        set status = ${status}, guard_verdict = ${verdict}, plan_hash = ${currentPlanHash},
            approved_plan_hash = ${verdict === "ALLOW" ? currentPlanHash : null}, approved_at = ${approvedAt}::timestamptz, updated_at = now()
        where id = ${planId}::uuid and local_user_id = ${localUserId}::uuid
      `;
      await transaction`delete from moniflow_private.guard_checks where plan_id = ${planId}::uuid`;
      for (const check of checks) {
        await transaction`
          insert into moniflow_private.guard_checks (plan_id, rule, passed, severity, message)
          values (${planId}::uuid, ${check.rule}, ${check.passed}, ${check.severity}, ${check.message})
        `;
      }
    });
    return this.findById(planId, localUserId);
  }

  async approve(planId: string, localUserId: string, approvedPlanHash: string): Promise<PersistedMoneyPlan | null> {
    await this.sql`
      update moniflow_private.money_plans
      set status = 'APPROVED', approved_plan_hash = ${approvedPlanHash}, approved_at = now(), updated_at = now()
      where id = ${planId}::uuid and local_user_id = ${localUserId}::uuid
        and status = 'AWAITING_USER_APPROVAL' and guard_verdict = 'REVIEW'
    `;
    return this.findById(planId, localUserId);
  }

  async invalidateApproval(planId: string, localUserId: string, _currentPlanHash: string): Promise<PersistedMoneyPlan | null> {
    await this.sql`
      update moniflow_private.money_plans
      set status = 'VALIDATING', guard_verdict = null, approved_plan_hash = null, approved_at = null, updated_at = now()
      where id = ${planId}::uuid and local_user_id = ${localUserId}::uuid
    `;
    return this.findById(planId, localUserId);
  }

  async close() {}
}

function mapMoneyPlanRow(row: z.infer<typeof moneyPlanRowSchema>): PersistedMoneyPlan {
  return {
    id: row.id,
    localUserId: row.local_user_id,
    originalInstruction: row.original_instruction,
    status: row.status as PersistedMoneyPlan["status"],
    intent: moniflowIntentSchema.parse(row.intent_payload),
    plan: moneyPlanSchema.parse(row.plan_payload),
    guardVerdict: row.guard_verdict as PersistedMoneyPlan["guardVerdict"],
    planHash: row.plan_hash,
    approvedPlanHash: row.approved_plan_hash,
    approvedAt: row.approved_at ? iso(row.approved_at) : null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}
