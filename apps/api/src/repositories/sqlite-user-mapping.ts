import { DatabaseSync } from "node:sqlite";

import { z } from "zod";

import type { UserMapping, UserMappingRepository } from "./user-mapping.js";

const userMappingRowSchema = z.object({
  local_user_id: z.string(),
  email: z.string(),
  bmoni_user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

function toDomain(row: unknown): UserMapping | null {
  if (row === undefined) return null;
  const parsed = userMappingRowSchema.parse(row);
  return {
    bmoniUserId: parsed.bmoni_user_id,
    createdAt: parsed.created_at,
    email: parsed.email,
    localUserId: parsed.local_user_id,
    updatedAt: parsed.updated_at
  };
}

function databaseFilename(databaseUrl: string) {
  if (databaseUrl === ":memory:") return databaseUrl;
  if (!databaseUrl.startsWith("file:")) throw new Error("SQLite DATABASE_URL must use file: or :memory:.");
  return databaseUrl.slice("file:".length);
}

export class SqliteUserMappingRepository implements UserMappingRepository {
  private readonly database: DatabaseSync;

  constructor(databaseUrl: string) {
    this.database = new DatabaseSync(databaseFilename(databaseUrl));
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS bmoni_user_mappings (
        local_user_id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        bmoni_user_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT
    `);
  }

  async findByEmail(email: string): Promise<UserMapping | null> {
    const row = this.database.prepare(`SELECT local_user_id, email, bmoni_user_id, created_at, updated_at FROM bmoni_user_mappings WHERE email = ? COLLATE NOCASE`).get(email);
    return toDomain(row);
  }

  async findByLocalUserId(localUserId: string): Promise<UserMapping | null> {
    const row = this.database.prepare(`SELECT local_user_id, email, bmoni_user_id, created_at, updated_at FROM bmoni_user_mappings WHERE local_user_id = ?`).get(localUserId);
    return toDomain(row);
  }

  async save(mapping: UserMapping): Promise<UserMapping> {
    this.database.prepare(`INSERT INTO bmoni_user_mappings (local_user_id, email, bmoni_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(mapping.localUserId, mapping.email, mapping.bmoniUserId, mapping.createdAt, mapping.updatedAt);
    return mapping;
  }

  async close() { this.database.close(); }
}
