import { DatabaseSync } from "node:sqlite";
import { z } from "zod";

export type WalletOwnership = {
  localUserId: string;
  ownerAddress: string;
  bmoniSmartWalletId: string;
  smartWalletAddress: string;
  currency: "CNGN";
  createdAt: string;
  updatedAt: string;
};

const rowSchema = z.object({
  local_user_id: z.string(), owner_address: z.string(), bmoni_smart_wallet_id: z.string(),
  smart_wallet_address: z.string(), currency: z.literal("CNGN"), created_at: z.string(), updated_at: z.string()
});

function databaseFilename(databaseUrl: string) {
  if (databaseUrl === ":memory:") return databaseUrl;
  if (!databaseUrl.startsWith("file:")) throw new Error("DATABASE_URL must use the file: scheme or :memory:.");
  return databaseUrl.slice("file:".length);
}

export class SqliteWalletOwnershipRepository {
  private readonly database: DatabaseSync;
  constructor(databaseUrl: string) {
    this.database = new DatabaseSync(databaseFilename(databaseUrl));
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS wallet_ownership (
        local_user_id TEXT PRIMARY KEY,
        owner_address TEXT NOT NULL,
        bmoni_smart_wallet_id TEXT NOT NULL UNIQUE,
        smart_wallet_address TEXT NOT NULL UNIQUE,
        currency TEXT NOT NULL CHECK (currency = 'CNGN'),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT
    `);
  }

  findByLocalUserId(localUserId: string): WalletOwnership | null {
    const row = this.database.prepare(`SELECT local_user_id, owner_address, bmoni_smart_wallet_id, smart_wallet_address, currency, created_at, updated_at FROM wallet_ownership WHERE local_user_id = ?`).get(localUserId);
    if (!row) return null;
    const parsed = rowSchema.parse(row);
    return {
      localUserId: parsed.local_user_id, ownerAddress: parsed.owner_address, bmoniSmartWalletId: parsed.bmoni_smart_wallet_id,
      smartWalletAddress: parsed.smart_wallet_address, currency: parsed.currency, createdAt: parsed.created_at, updatedAt: parsed.updated_at
    };
  }

  save(value: WalletOwnership): WalletOwnership {
    this.database.prepare(`
      INSERT INTO wallet_ownership (local_user_id, owner_address, bmoni_smart_wallet_id, smart_wallet_address, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(local_user_id) DO UPDATE SET owner_address = excluded.owner_address, bmoni_smart_wallet_id = excluded.bmoni_smart_wallet_id,
      smart_wallet_address = excluded.smart_wallet_address, currency = excluded.currency, updated_at = excluded.updated_at
    `).run(value.localUserId, value.ownerAddress, value.bmoniSmartWalletId, value.smartWalletAddress, value.currency, value.createdAt, value.updatedAt);
    return value;
  }

  close() { this.database.close(); }
}
