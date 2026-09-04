import { DatabaseSync } from "node:sqlite";
import { z } from "zod";

import type { ExecutionRepository, ProviderExecution } from "./execution.js";

const rowSchema = z.object({
  plan_id: z.string(), local_user_id: z.string(), provider_proposal_id: z.string(), provider_bank_account_id: z.string(),
  amount: z.number(), currency: z.literal("NGN"), sign_hash: z.string().nullable(), provider_status: z.string().nullable(),
  state: z.enum(["PREPARING", "AWAITING_DEVICE_SIGNATURE", "PROCESSING", "COMPLETED", "FAILED"]),
  created_at: z.string(), updated_at: z.string()
});

function databaseFilename(databaseUrl: string) {
  if (databaseUrl === ":memory:") return databaseUrl;
  if (!databaseUrl.startsWith("file:")) throw new Error("SQLite DATABASE_URL must use file: or :memory:.");
  return databaseUrl.slice("file:".length);
}

export class SqliteExecutionRepository implements ExecutionRepository {
  private readonly database: DatabaseSync;
  constructor(databaseUrl: string) {
    this.database = new DatabaseSync(databaseFilename(databaseUrl));
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS provider_executions_phase13 (
        plan_id TEXT PRIMARY KEY,
        local_user_id TEXT NOT NULL,
        provider_proposal_id TEXT NOT NULL UNIQUE,
        provider_bank_account_id TEXT NOT NULL,
        amount REAL NOT NULL CHECK (amount > 0),
        currency TEXT NOT NULL CHECK (currency = 'NGN'),
        sign_hash TEXT,
        provider_status TEXT,
        state TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT
    `);
  }

  async findByPlanId(planId: string, localUserId: string): Promise<ProviderExecution | null> {
    const row = this.database.prepare(`SELECT * FROM provider_executions_phase13 WHERE plan_id = ? AND local_user_id = ? LIMIT 1`).get(planId, localUserId);
    return row ? mapRow(rowSchema.parse(row)) : null;
  }

  async create(value: ProviderExecution): Promise<ProviderExecution> {
    this.database.prepare(`
      INSERT INTO provider_executions_phase13 (
        plan_id, local_user_id, provider_proposal_id, provider_bank_account_id, amount, currency,
        sign_hash, provider_status, state, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(value.planId, value.localUserId, value.providerProposalId, value.providerBankAccountId, value.amount, value.currency, value.signHash, value.providerStatus, value.state, value.createdAt, value.updatedAt);
    return value;
  }

  async update(value: ProviderExecution): Promise<ProviderExecution> {
    this.database.prepare(`
      UPDATE provider_executions_phase13
      SET provider_bank_account_id = ?, amount = ?, currency = ?, sign_hash = ?, provider_status = ?, state = ?, updated_at = ?
      WHERE plan_id = ? AND local_user_id = ? AND provider_proposal_id = ?
    `).run(value.providerBankAccountId, value.amount, value.currency, value.signHash, value.providerStatus, value.state, value.updatedAt, value.planId, value.localUserId, value.providerProposalId);
    return value;
  }

  async close() { this.database.close(); }
}

function mapRow(row: z.infer<typeof rowSchema>): ProviderExecution {
  return {
    planId: row.plan_id, localUserId: row.local_user_id, providerProposalId: row.provider_proposal_id,
    providerBankAccountId: row.provider_bank_account_id, amount: row.amount, currency: row.currency,
    signHash: row.sign_hash, providerStatus: row.provider_status, state: row.state,
    createdAt: row.created_at, updatedAt: row.updated_at
  };
}
