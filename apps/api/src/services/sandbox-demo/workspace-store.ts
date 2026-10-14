import { DatabaseSync } from "node:sqlite";
import postgres, { type Sql } from "postgres";
import { initialSandboxWorkspace, type SandboxWorkspace } from "./state.js";

/** Completely separate from BMONI user, wallet, execution, Pockets and Activity tables. */
export interface SandboxDemoStore {
  bootstrap(userId: string): Promise<SandboxWorkspace>;
  find(userId: string): Promise<SandboxWorkspace | null>;
  mutate(userId: string, update: (current: SandboxWorkspace) => SandboxWorkspace): Promise<SandboxWorkspace | null>;
  close(): Promise<void>;
}

function unpack(payload: unknown, userId: string): SandboxWorkspace {
  const state = (typeof payload === "string" ? JSON.parse(payload) : payload) as SandboxWorkspace;
  if (!state || state.localUserId !== userId || state.simulated !== true ||
      state.provider !== "moniflow-sandbox" || !Number.isFinite(state.providerBalance) ||
      !Number.isFinite(state.internalAllocated) || !Number.isFinite(state.availableToSpend) ||
      state.providerBalance < 0 || state.internalAllocated < 0 ||
      state.availableToSpend !== state.providerBalance - state.internalAllocated ||
      !Array.isArray(state.activity)) {
    throw new Error("SANDBOX_LEDGER_INTEGRITY_ERROR");
  }
  return state;
}

export class SqliteSandboxDemoStore implements SandboxDemoStore {
  private readonly db: DatabaseSync;
  constructor(databaseUrl: string) {
    const file = databaseUrl === ":memory:" ? databaseUrl
      : databaseUrl.startsWith("file:") ? databaseUrl.slice(5) : null;
    if (!file) throw new Error("The SQLite demo store needs file: or :memory:.");
    this.db = new DatabaseSync(file);
    this.db.exec("CREATE TABLE IF NOT EXISTS isolated_sandbox_demo_v1 (user_id TEXT PRIMARY KEY, state_json TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT");
  }
  async bootstrap(userId: string) {
    this.db.prepare("INSERT OR IGNORE INTO isolated_sandbox_demo_v1(user_id,state_json,updated_at) VALUES(?,?,?)")
      .run(userId, JSON.stringify(initialSandboxWorkspace(userId)), new Date().toISOString());
    return (await this.find(userId))!;
  }
  async find(userId: string) {
    const found = this.db.prepare("SELECT state_json FROM isolated_sandbox_demo_v1 WHERE user_id=?")
      .get(userId) as { state_json: string } | undefined;
    return found ? unpack(found.state_json, userId) : null;
  }
  async mutate(userId: string, update: (current: SandboxWorkspace) => SandboxWorkspace) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const before = await this.find(userId);
      if (!before) { this.db.exec("ROLLBACK"); return null; }
      const next = update(before);
      if (next !== before) {
        const valid = unpack(next, userId);
        this.db.prepare("UPDATE isolated_sandbox_demo_v1 SET state_json=?,updated_at=? WHERE user_id=?")
          .run(JSON.stringify(valid), valid.updatedAt, userId);
      }
      this.db.exec("COMMIT");
      return next;
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  async close() { this.db.close(); }
}

export class PostgresSandboxDemoStore implements SandboxDemoStore {
  private readonly sql: Sql;
  private schemaReady: Promise<void> | null = null;
  constructor(databaseUrl: string) {
    if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) throw new Error("Postgres demo store requires PostgreSQL.");
    this.sql = postgres(databaseUrl, { max: 3, prepare: false, idle_timeout: 20, connect_timeout: 10 });
  }
  private ready() {
    if (!this.schemaReady) {
      this.schemaReady = (async () => {
        await this.sql.unsafe("CREATE SCHEMA IF NOT EXISTS moniflow_private");
        await this.sql.unsafe("REVOKE ALL ON SCHEMA moniflow_private FROM PUBLIC");
        await this.sql.unsafe("CREATE TABLE IF NOT EXISTS moniflow_private.isolated_sandbox_demo_v1 (user_id uuid PRIMARY KEY, state_json jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())");
      })().catch(error => { this.schemaReady = null; throw error; });
    }
    return this.schemaReady;
  }
  async bootstrap(userId: string) {
    await this.ready();
    await this.sql.unsafe(
      "INSERT INTO moniflow_private.isolated_sandbox_demo_v1(user_id,state_json) VALUES ($1::uuid,$2::jsonb) ON CONFLICT(user_id) DO NOTHING",
      [userId, JSON.stringify(initialSandboxWorkspace(userId))]
    );
    return (await this.find(userId))!;
  }
  async find(userId: string) {
    await this.ready();
    const rows = await this.sql.unsafe("SELECT state_json FROM moniflow_private.isolated_sandbox_demo_v1 WHERE user_id=$1::uuid", [userId]);
    return rows[0] ? unpack(rows[0].state_json, userId) : null;
  }
  async mutate(userId: string, update: (current: SandboxWorkspace) => SandboxWorkspace) {
    await this.ready();
    return this.sql.begin(async tx => {
      // Locked row serializes competing attempts across all serverless instances.
      const rows = await tx.unsafe("SELECT state_json FROM moniflow_private.isolated_sandbox_demo_v1 WHERE user_id=$1::uuid FOR UPDATE", [userId]);
      if (!rows[0]) return null;
      const before = unpack(rows[0].state_json, userId);
      const next = update(before);
      if (next !== before) {
        const valid = unpack(next, userId);
        await tx.unsafe("UPDATE moniflow_private.isolated_sandbox_demo_v1 SET state_json=$1::jsonb,updated_at=now() WHERE user_id=$2::uuid", [JSON.stringify(valid), userId]);
      }
      return next;
    });
  }
  async close() { await this.sql.end({ timeout: 5 }); }
}
export function createSandboxDemoStore(databaseUrl: string): SandboxDemoStore {
  return /^postgres(?:ql)?:\/\//i.test(databaseUrl)
    ? new PostgresSandboxDemoStore(databaseUrl) : new SqliteSandboxDemoStore(databaseUrl);
}
