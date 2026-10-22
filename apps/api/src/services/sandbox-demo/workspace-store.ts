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
      state.provider !== "moniflow-sandbox" ||
      !Number.isSafeInteger(state.providerBalance) ||
      !Number.isSafeInteger(state.internalAllocated) ||
      !Number.isSafeInteger(state.availableToSpend) ||
      !Number.isSafeInteger(state.resetCount) || state.resetCount < 0 ||
      state.providerBalance < 0 || state.internalAllocated < 0 ||
      state.availableToSpend < 0 ||
      state.availableToSpend !== state.providerBalance - state.internalAllocated ||
      !Array.isArray(state.activity)) {
    throw new Error("SANDBOX_LEDGER_INTEGRITY_ERROR");
  }

  // Ledger mutations are isolated, but should also reject invalid/corrupt
  // records before committing them across SQLite or PostgreSQL instances.
  const plan = state.plan;
  if (plan === null) {
    if (state.activity.length || state.internalAllocated !== 0) {
      throw new Error("SANDBOX_LEDGER_INTEGRITY_ERROR");
    }
    return state;
  }
  if (!plan || !["AWAITING_APPROVAL", "APPROVED", "COMPLETED"].includes(plan.state) ||
      !/^[a-f0-9]{64}$/.test(plan.planHash) || !plan.plan?.totals || !plan.verdict ||
      (plan.state !== "COMPLETED" && state.activity.length !== 0) ||
      (plan.state === "AWAITING_APPROVAL" && plan.approvedHash !== null)) {
    throw new Error("SANDBOX_LEDGER_INTEGRITY_ERROR");
  }
  if (plan.state === "COMPLETED") {
    const withdrawal = state.activity.find(entry =>
      entry.reference === plan.id + ":withdrawal" &&
      entry.kind === "BANK_WITHDRAWAL" && entry.source === "simulated_external");
    const allocation = state.activity.find(entry =>
      entry.reference === plan.id + ":allocation" &&
      entry.kind === "POCKET_ALLOCATION" && entry.source === "simulated_internal");
    if (state.activity.length !== 2 ||
        plan.approvedHash !== plan.planHash ||
        plan.plan.totals.availableAfter !== state.availableToSpend ||
        !withdrawal || !allocation ||
        !Number.isSafeInteger(withdrawal.amount) ||
        !Number.isSafeInteger(allocation.amount) ||
        withdrawal.status !== "SIMULATED" || allocation.status !== "SIMULATED" ||
        withdrawal.amount !== plan.plan.totals.externalMovement ||
        allocation.amount !== plan.plan.totals.internalAllocation) {
      throw new Error("SANDBOX_LEDGER_INTEGRITY_ERROR");
    }
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
      // No await while holding the synchronous SQLite transaction:
      // another request on the same DB connection must not BEGIN inside it.
      const row = this.db.prepare("SELECT state_json FROM isolated_sandbox_demo_v1 WHERE user_id=?")
        .get(userId) as { state_json: string } | undefined;
      if (!row) { this.db.exec("ROLLBACK"); return null; }
      const before = unpack(row.state_json, userId);
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
        // Two cold Vercel instances can concurrently create the same schema/table.
        // CREATE TABLE IF NOT EXISTS alone is not safe for first-use concurrency.
        await this.sql.begin(async tx => {
          await tx.unsafe("SELECT pg_advisory_xact_lock(824219327, 2)");
          await tx.unsafe("CREATE SCHEMA IF NOT EXISTS moniflow_private");
          await tx.unsafe("REVOKE ALL ON SCHEMA moniflow_private FROM PUBLIC");
          await tx.unsafe("CREATE TABLE IF NOT EXISTS moniflow_private.isolated_sandbox_demo_v1 (user_id uuid PRIMARY KEY, state_json jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())");
        });
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
