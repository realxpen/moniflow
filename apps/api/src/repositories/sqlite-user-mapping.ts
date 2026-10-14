import { DatabaseSync } from "node:sqlite";

import { z } from "zod";

import type { UserMapping, UserMappingRepository, UserProvisioningHold } from "./user-mapping.js";

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
      ) STRICT;
      CREATE TABLE IF NOT EXISTS bmoni_user_provisioning_holds_v1 (
        email TEXT PRIMARY KEY COLLATE NOCASE,
        local_user_id TEXT,
        state TEXT NOT NULL CHECK (state IN ('PROVIDER_USER_EXISTS','PROVIDER_OUTCOME_UNKNOWN')),
        created_at TEXT NOT NULL
      ) STRICT;
      CREATE UNIQUE INDEX IF NOT EXISTS bmoni_provisioning_hold_local_id_unique_v1
      ON bmoni_user_provisioning_holds_v1(local_user_id)
      WHERE local_user_id IS NOT NULL
    `);
    // Historical holds cannot be backfilled safely.
    const columns=this.database.prepare("PRAGMA table_info(bmoni_user_provisioning_holds_v1)")
      .all() as Array<{name:string}>;
    if(!columns.some(c=>c.name==="phone_fingerprint")){
      this.database.exec("ALTER TABLE bmoni_user_provisioning_holds_v1 ADD COLUMN phone_fingerprint TEXT");
    }
    this.database.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS bmoni_hold_phone_fingerprint_unique_v1 "+
      "ON bmoni_user_provisioning_holds_v1(phone_fingerprint) "+
      "WHERE phone_fingerprint IS NOT NULL"
    );
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

  async reserveBeforeCreate(hold: UserProvisioningHold): Promise<boolean> {
    if (!hold.localUserId || hold.state!=="PROVIDER_OUTCOME_UNKNOWN" ||
        !/^[a-f0-9]{64}$/.test(hold.phoneFingerprint??"")) {
      throw new Error("BMONI_INVALID_CREATE_RESERVATION");
    }
    // SQLite inserts are serialized even across processes. Either competing
    // email or local UUID claims wins, never both.
    const inserted=this.database.prepare(
      "INSERT OR IGNORE INTO bmoni_user_provisioning_holds_v1(email,local_user_id,state,created_at,phone_fingerprint) VALUES (?,?,?,?,?)"
    ).run(hold.email.trim().toLowerCase(),hold.localUserId,hold.state,hold.createdAt,hold.phoneFingerprint);
    return inserted.changes===1;
  }

  async markProviderUserExists(email:string):Promise<void> {
    const updated=this.database.prepare(
      "UPDATE bmoni_user_provisioning_holds_v1 SET state='PROVIDER_USER_EXISTS' WHERE email=? COLLATE NOCASE AND state='PROVIDER_OUTCOME_UNKNOWN'"
    ).run(email.trim().toLowerCase());
    if(updated.changes!==1){
      const existing=await this.findHoldByEmail(email);
      if(existing?.state!=="PROVIDER_USER_EXISTS") throw new Error("BMONI_IDENTITY_HOLD_NOT_FOUND");
    }
  }

  async findHoldByEmail(email: string): Promise<UserProvisioningHold | null> {
    const row=this.database.prepare(
      "SELECT email,local_user_id,state,created_at,phone_fingerprint FROM bmoni_user_provisioning_holds_v1 WHERE email=? COLLATE NOCASE LIMIT 1"
    ).get(email.trim().toLowerCase()) as Record<string,unknown>|undefined;
    return row ? {
      email:String(row.email),
      localUserId:row.local_user_id===null?null:String(row.local_user_id),
      phoneFingerprint:row.phone_fingerprint===null?null:String(row.phone_fingerprint),
      state:String(row.state) as UserProvisioningHold["state"],
      createdAt:String(row.created_at)
    } : null;
  }

  async findHoldByPhoneFingerprint(fingerprint:string):Promise<UserProvisioningHold|null> {
    if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error("BMONI_INVALID_PHONE_FINGERPRINT");
    const row=this.database.prepare(
      "SELECT email,local_user_id,state,created_at,phone_fingerprint "+
      "FROM bmoni_user_provisioning_holds_v1 WHERE phone_fingerprint=? LIMIT 1"
    ).get(fingerprint) as Record<string,unknown>|undefined;
    return row ? {
      email:String(row.email),localUserId:row.local_user_id===null?null:String(row.local_user_id),
      phoneFingerprint:String(row.phone_fingerprint),
      state:String(row.state) as UserProvisioningHold["state"],
      createdAt:String(row.created_at)
    } : null;
  }

  async createHold(hold:UserProvisioningHold):Promise<UserProvisioningHold> {
    // The first uncertain outcome is authoritative until human reconciliation.
    this.database.prepare(
      "INSERT OR IGNORE INTO bmoni_user_provisioning_holds_v1(email,local_user_id,state,created_at,phone_fingerprint) VALUES (?,?,?,?,?)"
    ).run(hold.email.trim().toLowerCase(),hold.localUserId,hold.state,hold.createdAt,hold.phoneFingerprint??null);
    const existing=await this.findHoldByEmail(hold.email);
    if (!existing || (existing.localUserId && hold.localUserId && existing.localUserId!==hold.localUserId) ||
        (hold.phoneFingerprint && existing.phoneFingerprint!==hold.phoneFingerprint)) {
      throw new Error("BMONI_PROVISIONING_HOLD_IDENTITY_CONFLICT");
    }
    return existing;
  }

  async close() { this.database.close(); }
}
