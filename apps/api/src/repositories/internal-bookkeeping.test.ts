import { afterEach, describe, expect, it } from "vitest";

import { SqliteActivityRepository } from "./sqlite-activity.js";
import { SqlitePocketRepository } from "./sqlite-pocket.js";

const closers: Array<() => Promise<void>> = [];
afterEach(async () => { await Promise.all(closers.splice(0).map((close) => close())); });

describe("MONIFlow internal bookkeeping", () => {
  it("applies one plan allocation exactly once", async () => {
    const pockets = new SqlitePocketRepository(":memory:");
    closers.push(() => pockets.close());
    const input = {
      localUserId: "11111111-1111-4111-8111-111111111111",
      planId: "22222222-2222-4222-8222-222222222222",
      actionIndex: 2,
      name: "Laptop",
      amount: 20_000
    };
    const first = await pockets.applyPlanAllocation(input);
    const second = await pockets.applyPlanAllocation(input);
    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(second.pocket.allocatedAmount).toBe(20_000);
    expect(await pockets.totalAllocated(input.localUserId)).toBe(20_000);
  });

  it("records financial memory exactly once per reference", async () => {
    const activity = new SqliteActivityRepository(":memory:");
    closers.push(() => activity.close());
    const input = {
      localUserId: "11111111-1111-4111-8111-111111111111",
      kind: "BANK_WITHDRAWAL",
      status: "COMPLETED",
      amount: 40_000,
      currency: "NGN",
      reference: "plan:test:withdrawal:1",
      source: "provider" as const,
      metadata: { planId: "test" }
    };
    const first = await activity.recordOnce(input);
    const second = await activity.recordOnce(input);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(await activity.list(input.localUserId)).toHaveLength(1);
  });
});
