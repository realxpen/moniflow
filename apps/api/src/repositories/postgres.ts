import postgres, { type Sql } from "postgres";
import { z } from "zod";

import type { UserMapping, UserMappingRepository } from "./user-mapping.js";
import type { WalletOwnership, WalletOwnershipRepository } from "./wallet-ownership.js";

const userRowSchema = z.object({
  local_user_id: z.string(), email: z.string(), bmoni_user_id: z.string(), created_at: z.coerce.string(), updated_at: z.coerce.string()
});
const walletRowSchema = z.object({
  local_user_id: z.string(), owner_address: z.string(), bmoni_smart_wallet_id: z.string(), smart_wallet_address: z.string(),
  currency: z.literal("CNGN"), created_at: z.coerce.string(), updated_at: z.coerce.string()
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
      status text not null check (status in ('DRAFT','PARSING','VALIDATING','BLOCKED','AWAITING_USER_APPROVAL','APPROVED','EXECUTING','AWAITING_DEVICE_SIGNATURE','PROCESSING','COMPLETED','FAILED','CANCELLED')),
      currency text not null default 'NGN' check (currency = 'NGN'),
      balance_before numeric(20,2) not null check (balance_before >= 0),
      external_movement numeric(20,2) not null default 0 check (external_movement >= 0),
      internal_allocation numeric(20,2) not null default 0 check (internal_allocation >= 0),
      expected_available_after numeric(20,2) not null,
      guard_verdict text check (guard_verdict in ('ALLOW','REVIEW','BLOCK')),
      plan_hash text,
      created_at timestamptz not null default now(),
      approved_at timestamptz,
      completed_at timestamptz,
      updated_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists money_plans_local_user_created_idx on moniflow_private.money_plans(local_user_id, created_at desc)`;

  await sql`
    create table if not exists moniflow_private.plan_actions (
      id uuid primary key default gen_random_uuid(),
      money_plan_id uuid not null references moniflow_private.money_plans(id) on delete cascade,
      type text not null,
      amount numeric(20,2) not null default 0 check (amount >= 0),
      destination_type text,
      destination_id text,
      label text,
      position integer not null check (position > 0),
      status text not null default 'DRAFT',
      requires_approval boolean not null default false,
      created_at timestamptz not null default now(),
      unique(money_plan_id, position)
    )
  `;

  await sql`
    create table if not exists moniflow_private.guard_checks (
      id uuid primary key default gen_random_uuid(),
      money_plan_id uuid not null references moniflow_private.money_plans(id) on delete cascade,
      rule text not null,
      passed boolean not null,
      severity text not null default 'CRITICAL',
      message text,
      created_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists moniflow_private.activities (
      id uuid primary key default gen_random_uuid(),
      local_user_id uuid not null references moniflow_private.bmoni_user_mappings(local_user_id) on delete cascade,
      money_plan_id uuid references moniflow_private.money_plans(id) on delete set null,
      type text not null,
      amount numeric(20,2),
      currency text not null default 'NGN',
      source text not null check (source in ('BMONI','MONIFLOW')),
      provider_reference text,
      status text not null,
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
      on conflict (local_user_id) do update set
        owner_address = excluded.owner_address,
        bmoni_smart_wallet_id = excluded.bmoni_smart_wallet_id,
        smart_wallet_address = excluded.smart_wallet_address,
        currency = excluded.currency,
        updated_at = excluded.updated_at
    `;
    return value;
  }

  async close() {}
}
