import type { Sql } from "postgres";
import { z } from "zod";

import type { BankAccountRepository, VerifiedBankAccount } from "./bank-account.js";
import { normalizeBankLabel } from "./bank-account.js";

const rowSchema = z.object({
  id: z.string(),
  local_user_id: z.string(),
  label: z.string(),
  bmoni_withdrawal_account_id: z.string(),
  bank_code: z.string(),
  bank_name: z.string(),
  account_number_masked: z.string(),
  account_name: z.string(),
  verified: z.boolean(),
  created_at: z.coerce.string(),
  updated_at: z.coerce.string()
});

export async function ensureBankAccountSchema(sql: Sql) {
  // The live MONIFlow schema already uses label, bmoni_withdrawal_account_id,
  // account_number_masked, and account_name. Add only the normalized lookup key.
  await sql`alter table moniflow_private.bank_accounts add column if not exists normalized_label text`;
  await sql`
    update moniflow_private.bank_accounts
    set normalized_label = lower(regexp_replace(label, '[^a-zA-Z0-9]', '', 'g'))
    where normalized_label is null
  `;
  await sql`alter table moniflow_private.bank_accounts alter column normalized_label set not null`;
  await sql`create unique index if not exists bank_accounts_local_user_label_idx on moniflow_private.bank_accounts(local_user_id, normalized_label)`;
}

export class PostgresBankAccountRepository implements BankAccountRepository {
  constructor(private readonly sql: Sql) {}

  async findVerifiedByLabel(localUserId: string, label: string): Promise<VerifiedBankAccount | null> {
    const rows = await this.sql`
      select id, local_user_id, label, bmoni_withdrawal_account_id, bank_code, bank_name,
             account_number_masked, account_name, verified, created_at, updated_at
      from moniflow_private.bank_accounts
      where local_user_id = ${localUserId}::uuid
        and normalized_label = ${normalizeBankLabel(label)}
        and verified = true
        and bmoni_withdrawal_account_id is not null
      limit 1
    `;
    return rows[0] ? mapRow(rowSchema.parse(rows[0])) : null;
  }

  async findVerifiedByProviderId(localUserId: string, providerAccountId: string): Promise<VerifiedBankAccount | null> {
    const rows = await this.sql`
      select id, local_user_id, label, bmoni_withdrawal_account_id, bank_code, bank_name,
             account_number_masked, account_name, verified, created_at, updated_at
      from moniflow_private.bank_accounts
      where local_user_id = ${localUserId}::uuid
        and bmoni_withdrawal_account_id = ${providerAccountId}
        and verified = true
      limit 1
    `;
    return rows[0] ? mapRow(rowSchema.parse(rows[0])) : null;
  }

  async saveVerified(account: VerifiedBankAccount): Promise<VerifiedBankAccount> {
    await this.sql`
      insert into moniflow_private.bank_accounts (
        id, local_user_id, label, normalized_label, bank_code, bank_name,
        account_number_masked, account_name, bmoni_withdrawal_account_id,
        verified, created_at, updated_at
      ) values (
        ${account.id}::uuid,
        ${account.localUserId}::uuid,
        ${account.label},
        ${normalizeBankLabel(account.label)},
        ${account.bankCode},
        ${account.bankName},
        ${account.maskedAccountNumber},
        ${account.accountHolderName},
        ${account.providerAccountId},
        true,
        ${account.createdAt}::timestamptz,
        ${account.updatedAt}::timestamptz
      )
      on conflict (local_user_id, normalized_label) do update set
        label = excluded.label,
        bank_code = excluded.bank_code,
        bank_name = excluded.bank_name,
        account_number_masked = excluded.account_number_masked,
        account_name = excluded.account_name,
        bmoni_withdrawal_account_id = excluded.bmoni_withdrawal_account_id,
        verified = true,
        updated_at = excluded.updated_at
    `;
    const saved = await this.findVerifiedByLabel(account.localUserId, account.label);
    if (!saved) throw new Error("Verified bank destination could not be reloaded.");
    return saved;
  }

  async close() {}
}

function mapRow(row: z.infer<typeof rowSchema>): VerifiedBankAccount {
  return {
    id: row.id,
    localUserId: row.local_user_id,
    label: row.label,
    providerAccountId: row.bmoni_withdrawal_account_id,
    bankCode: row.bank_code,
    bankName: row.bank_name,
    maskedAccountNumber: row.account_number_masked,
    accountHolderName: row.account_name,
    verified: true,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}
