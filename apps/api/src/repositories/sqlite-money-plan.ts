import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";

import type { GuardCheck } from "@moniflow/moniguard";

import { moniflowIntentSchema } from "../schemas/intent.js";
import { moneyPlanSchema } from "../schemas/money-plan.js";
import type {
  CreatePersistedMoneyPlanInput,
  MoneyPlanRepository,
  PersistedMoneyPlan
} from "./money-plan.js";

const rowSchema = z.object({
  id: z.string(), local_user_id: z.string(), original_instruction: z.string(), status: z.string(),
  intent_payload: z.string(), plan_payload: z.string(), guard_verdict: z.string().nullable(), plan_hash: z.string(),
  approved_plan_hash: z.string().nullable(), approved_at: z.string().nullable(), created_at: z.string(), updated_at: z.string()
});

function databaseFilename(databaseUrl: string) {
  if (databaseUrl === ":memory:") return databaseUrl;
  if (!databaseUrl.startsWith("file:")) throw new Error("SQLite DATABASE_URL must use file: or :memory:.");
  return databaseUrl.slice("file:".length);
}

export class SqliteMoneyPlanRepository implements MoneyPlanRepository {
  private readonly database: DatabaseSync;

  constructor(databaseUrl: string) {
    this.database = new DatabaseSync(databaseFilename(databaseUrl));
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS money_plans_phase11 (
        id TEXT PRIMARY KEY, local_user_id TEXT NOT NULL, original_instruction TEXT NOT NULL, status TEXT NOT NULL,
        intent_payload TEXT NOT NULL, plan_payload TEXT NOT NULL, guard_verdict TEXT, plan_hash TEXT NOT NULL,
        approved_plan_hash TEXT, approved_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS guard_checks_phase11 (
        id TEXT PRIMARY KEY, money_plan_id TEXT NOT NULL, rule TEXT NOT NULL, passed INTEGER NOT NULL,
        severity TEXT NOT NULL, message TEXT, created_at TEXT NOT NULL
      ) STRICT;
    `);
  }

  async create(input: CreatePersistedMoneyPlanInput): Promise<PersistedMoneyPlan> {
    const now = new Date().toISOString();
    const id = randomUUID();
    this.database.prepare(`
      INSERT INTO money_plans_phase11 (
        id, local_user_id, original_instruction, status, intent_payload, plan_payload,
        guard_verdict, plan_hash, approved_plan_hash, approved_at, created_at, updated_at
      ) VALUES (?, ?, ?, 'VALIDATING', ?, ?, NULL, ?, NULL, NULL, ?, ?)
    `).run(id, input.localUserId, input.originalInstruction, JSON.stringify(input.intent), JSON.stringify(input.plan), input.planHash, now, now);
    return (await this.findById(id, input.localUserId))!;
  }

  async findById(planId: string, localUserId: string): Promise<PersistedMoneyPlan | null> {
    const row = this.database.prepare(`
      SELECT id, local_user_id, original_instruction, status, intent_payload, plan_payload,
             guard_verdict, plan_hash, approved_plan_hash, approved_at, created_at, updated_at
      FROM money_plans_phase11 WHERE id = ? AND local_user_id = ?
    `).get(planId, localUserId);
    return row ? mapRow(rowSchema.parse(row)) : null;
  }

  async recordGuard(
    planId: string,
    localUserId: string,
    verdict: "ALLOW" | "REVIEW" | "BLOCK",
    checks: GuardCheck[],
    currentPlanHash: string
  ): Promise<PersistedMoneyPlan | null> {
    const now = new Date().toISOString();
    const status = verdict === "BLOCK" ? "BLOCKED" : verdict === "REVIEW" ? "AWAITING_USER_APPROVAL" : "APPROVED";
    const approvedHash = verdict === "ALLOW" ? currentPlanHash : null;
    const approvedAt = verdict === "ALLOW" ? now : null;
    this.database.prepare(`
      UPDATE money_plans_phase11
      SET status = ?, guard_verdict = ?, plan_hash = ?, approved_plan_hash = ?, approved_at = ?, updated_at = ?
      WHERE id = ? AND local_user_id = ?
    `).run(status, verdict, currentPlanHash, approvedHash, approvedAt, now, planId, localUserId);
    this.database.prepare(`DELETE FROM guard_checks_phase11 WHERE money_plan_id = ?`).run(planId);
    const insert = this.database.prepare(`
      INSERT INTO guard_checks_phase11 (id, money_plan_id, rule, passed, severity, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const check of checks) insert.run(randomUUID(), planId, check.rule, check.passed ? 1 : 0, check.severity, check.message, now);
    return this.findById(planId, localUserId);
  }

  async approve(planId: string, localUserId: string, approvedPlanHash: string): Promise<PersistedMoneyPlan | null> {
    const now = new Date().toISOString();
    this.database.prepare(`
      UPDATE money_plans_phase11
      SET status = 'APPROVED', approved_plan_hash = ?, approved_at = ?, updated_at = ?
      WHERE id = ? AND local_user_id = ? AND status = 'AWAITING_USER_APPROVAL' AND guard_verdict = 'REVIEW'
    `).run(approvedPlanHash, now, now, planId, localUserId);
    return this.findById(planId, localUserId);
  }

  async invalidateApproval(planId: string, localUserId: string, _currentPlanHash: string): Promise<PersistedMoneyPlan | null> {
    const now = new Date().toISOString();
    // Keep plan_hash as the last MONI Guard-approved fingerprint. A changed plan cannot be approved
    // again until recordGuard runs and establishes a new authoritative fingerprint.
    this.database.prepare(`
      UPDATE money_plans_phase11
      SET status = 'VALIDATING', guard_verdict = NULL, approved_plan_hash = NULL, approved_at = NULL, updated_at = ?
      WHERE id = ? AND local_user_id = ?
    `).run(now, planId, localUserId);
    return this.findById(planId, localUserId);
  }

  async close() { this.database.close(); }
}

function mapRow(row: z.infer<typeof rowSchema>): PersistedMoneyPlan {
  return {
    id: row.id,
    localUserId: row.local_user_id,
    originalInstruction: row.original_instruction,
    status: row.status as PersistedMoneyPlan["status"],
    intent: moniflowIntentSchema.parse(JSON.parse(row.intent_payload)),
    plan: moneyPlanSchema.parse(JSON.parse(row.plan_payload)),
    guardVerdict: row.guard_verdict as PersistedMoneyPlan["guardVerdict"],
    planHash: row.plan_hash,
    approvedPlanHash: row.approved_plan_hash,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
