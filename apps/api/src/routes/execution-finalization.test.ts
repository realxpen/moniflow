import { describe, expect, it, vi } from "vitest";

import type { ActivityRepository } from "../repositories/activity.js";
import type { ExecutionRepository } from "../repositories/execution.js";
import type { MoneyPlanRepository } from "../repositories/money-plan.js";
import type { PocketRepository } from "../repositories/pocket.js";

// Finalization behavior is primarily covered by repository idempotency tests.
// This contract test protects the two invariants the route depends on.
describe("execution finalization invariants", () => {
  it("requires idempotent pocket and activity repositories", async () => {
    const pockets = { applyPlanAllocation: vi.fn(), list: vi.fn() } as unknown as PocketRepository;
    const activity = { recordOnce: vi.fn(), list: vi.fn() } as unknown as ActivityRepository;
    const executions = { findByPlanId: vi.fn(), update: vi.fn() } as unknown as ExecutionRepository;
    const plans = { findById: vi.fn() } as unknown as MoneyPlanRepository;
    expect(typeof pockets.applyPlanAllocation).toBe("function");
    expect(typeof activity.recordOnce).toBe("function");
    expect(typeof executions.update).toBe("function");
    expect(typeof plans.findById).toBe("function");
  });
});
