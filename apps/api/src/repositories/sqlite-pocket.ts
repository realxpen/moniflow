import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";

import type { PlanPocketAllocation, Pocket, PocketRepository } from "./pocket.js";

const rowSchema = z.object({
  id: z.string(),
  local_user_id: z.string(),
  name: z.string(),
  target_amount: z.number().nullable(),
  allocated_amount: z.number(),
  currency: z.literal("NGN"),
  created_at: z.string(),
  updated_at: z.string()
});

function databaseFilename(databaseUrl: string) {
  if (databaseUrl === ":memory:") return databaseUrl;
  if (!databaseUrl.startsWith("file:")) throw new Error("SQLite DATABASE_URL must use file: or :memory:.");
  return databaseUrl.slice("file:".length);
}

export class SqlitePocketRepository implements PocketRepository {
  private readonly database: DatabaseSync;

  constructor(databaseUrl: string) {
    this.database = new DatabaseSync(databaseFilename(databaseUrl));
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS pockets_phase14 (
        id TEXT PRIMARY KEY,
        local_user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        target_amount REAL,
        allocated_amount REAL NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0),
        currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(local_user_id, name)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS pocket_plan_allocations_phase14 (
        plan_id TEXT NOT NULL,
        action_index INTEGER NOT NULL,
        local_user_id TEXT NOT NULL,
        pocket_id TEXT NOT NULL,
        amount REAL NOT NULL CHECK (amount > 0),
        created_at TEXT NOT NULL,
        PRIMARY KEY(plan_id, action_index)
      ) STRICT;
    `);
  }

  async list(localUserId: string): Promise<Pocket[]> {
    const rows = this.database.prepare(`SELECT * FROM pockets_phase14 WHERE local_user_id = ? ORDER BY created_at ASC`).all(localUserId);
    return rows.map((row) => mapRow(rowSchema.parse(row)));
  }

  async create(input: { localUserId: string; name: string; targetAmount?: number | null }): Promise<Pocket> {
    const existing = this.database.prepare(`SELECT * FROM pockets_phase14 WHERE local_user_id = ? AND name = ? LIMIT 1`).get(input.localUserId, input.name);
    if (existing) return mapRow(rowSchema.parse(existing));

    const now = new Date().toISOString();
    const value: Pocket = {
      id: randomUUID(),
      localUserId: input.localUserId,
      name: input.name,
      targetAmount: input.targetAmount ?? null,
      allocatedAmount: 0,
      currency: "NGN",
      createdAt: now,
      updatedAt: now
    };
    this.database.prepare(`
      INSERT INTO pockets_phase14 (id, local_user_id, name, target_amount, allocated_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, 'NGN', ?, ?)
    `).run(value.id, value.localUserId, value.name, value.targetAmount, now, now);
    return value;
  }

  async applyPlanAllocation(input: PlanPocketAllocation): Promise<{ pocket: Pocket; applied: boolean }> {
    const existingAllocation = this.database.prepare(`
      SELECT pocket_id FROM pocket_plan_allocations_phase14 WHERE plan_id = ? AND action_index = ? LIMIT 1
    `).get(input.planId, input.actionIndex) as { pocket_id?: string } | undefined;
    if (existingAllocation?.pocket_id) {
      const row = this.database.prepare(`SELECT * FROM pockets_phase14 WHERE id = ? LIMIT 1`).get(existingAllocation.pocket_id);
      if (!row) throw new Error("Pocket allocation ledger references a missing pocket.");
      return { pocket: mapRow(rowSchema.parse(row)), applied: false };
    }

    this.database.exec("BEGIN IMMEDIATE");
    try {
      let row = this.database.prepare(`SELECT * FROM pockets_phase14 WHERE local_user_id = ? AND name = ? LIMIT 1`).get(input.localUserId, input.name);
      if (!row) {
        const now = new Date().toISOString();
        const id = randomUUID();
        this.database.prepare(`
          INSERT INTO pockets_phase14 (id, local_user_id, name, target_amount, allocated_amount, currency, created_at, updated_at)
          VALUES (?, ?, ?, NULL, 0, 'NGN', ?, ?)
        `).run(id, input.localUserId, input.name, now, now);
        row = this.database.prepare(`SELECT * FROM pockets_phase14 WHERE id = ?`).get(id);
      }
      const pocket = mapRow(rowSchema.parse(row));
      const now = new Date().toISOString();
      this.database.prepare(`
        INSERT INTO pocket_plan_allocations_phase14 (plan_id, action_index, local_user_id, pocket_id, amount, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(input.planId, input.actionIndex, input.localUserId, pocket.id, input.amount, now);
      this.database.prepare(`UPDATE pockets_phase14 SET allocated_amount = allocated_amount + ?, updated_at = ? WHERE id = ?`).run(input.amount, now, pocket.id);
      const updatedRow = this.database.prepare(`SELECT * FROM pockets_phase14 WHERE id = ?`).get(pocket.id);
      this.database.exec("COMMIT");
      return { pocket: mapRow(rowSchema.parse(updatedRow)), applied: true };
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  async totalAllocated(localUserId: string): Promise<number> {
    const row = this.database.prepare(`SELECT COALESCE(SUM(allocated_amount), 0) AS total FROM pockets_phase14 WHERE local_user_id = ?`).get(localUserId) as { total?: number };
    return Number(row?.total ?? 0);
  }

  async close() { this.database.close(); }
}

function mapRow(row: z.infer<typeof rowSchema>): Pocket {
  return {
    id: row.id,
    localUserId: row.local_user_id,
    name: row.name,
    targetAmount: row.target_amount,
    allocatedAmount: row.allocated_amount,
    currency: row.currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
