import { DatabaseSync } from "node:sqlite";
import { z } from "zod";

import type { BankAccountRepository, VerifiedBankAccount } from "./bank-account.js";
import { normalizeBankLabel } from "./bank-account.js";

const rowSchema = z.object({
  id: z.string(), local_user_id: z.string(), label: z.string(), provider_account_id: z.string(), bank_code: z.string(),
  bank_name: z.string(), masked_account_number: z.string(), account_holder_name: z.string(), verified: z.number(),
  created_at: z.string(), updated_at: z.string()
});

function databaseFilename(databaseUrl: string) {
  if (databaseUrl === ":memory:") return databaseUrl;
  if (!databaseUrl.startsWith("file:")) throw new Error("SQLite DATABASE_URL must use file: or :memory:.");
  return databaseUrl.slice("file:".length);
}

export class SqliteBankAccountRepository implements BankAccountRepository {
  private readonly database: DatabaseSync;
  constructor(databaseUrl: string) {
    this.database = new DatabaseSync(databaseFilename(databaseUrl));
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS bank_accounts_phase12 (
        id TEXT PRIMARY KEY,
        local_user_id TEXT NOT NULL,
        label TEXT NOT NULL,
        normalized_label TEXT NOT NULL,
        provider_account_id TEXT NOT NULL UNIQUE,
        bank_code TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        masked_account_number TEXT NOT NULL,
        account_holder_name TEXT NOT NULL,
        verified INTEGER NOT NULL CHECK (verified IN (0,1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(local_user_id, normalized_label)
      ) STRICT
    `);
  }

  async findVerifiedByLabel(localUserId: string, label: string): Promise<VerifiedBankAccount | null> {
    const row = this.database.prepare(`SELECT * FROM bank_accounts_phase12 WHERE local_user_id = ? AND normalized_label = ? AND verified = 1 LIMIT 1`).get(localUserId, normalizeBankLabel(label));
    return row ? mapRow(rowSchema.parse(row)) : null;
  }

  async findVerifiedByProviderId(localUserId: string, providerAccountId: string): Promise<VerifiedBankAccount | null> {
    const row = this.database.prepare(`SELECT * FROM bank_accounts_phase12 WHERE local_user_id = ? AND provider_account_id = ? AND verified = 1 LIMIT 1`).get(localUserId, providerAccountId);
    return row ? mapRow(rowSchema.parse(row)) : null;
  }

  async saveVerified(account: VerifiedBankAccount): Promise<VerifiedBankAccount> {
    this.database.prepare(`
      INSERT INTO bank_accounts_phase12 (id, local_user_id, label, normalized_label, provider_account_id, bank_code, bank_name, masked_account_number, account_holder_name, verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(local_user_id, normalized_label) DO UPDATE SET
        label = excluded.label, provider_account_id = excluded.provider_account_id, bank_code = excluded.bank_code,
        bank_name = excluded.bank_name, masked_account_number = excluded.masked_account_number,
        account_holder_name = excluded.account_holder_name, verified = 1, updated_at = excluded.updated_at
    `).run(account.id, account.localUserId, account.label, normalizeBankLabel(account.label), account.providerAccountId, account.bankCode, account.bankName, account.maskedAccountNumber, account.accountHolderName, account.createdAt, account.updatedAt);
    return account;
  }

  async close() { this.database.close(); }
}

function mapRow(row: z.infer<typeof rowSchema>): VerifiedBankAccount {
  return {
    id: row.id, localUserId: row.local_user_id, label: row.label, providerAccountId: row.provider_account_id,
    bankCode: row.bank_code, bankName: row.bank_name, maskedAccountNumber: row.masked_account_number,
    accountHolderName: row.account_holder_name, verified: true, createdAt: row.created_at, updatedAt: row.updated_at
  };
}
