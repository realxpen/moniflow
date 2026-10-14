import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { SqliteSandboxDemoStore } from "./workspace-store.js";
import { SANDBOX_COMMAND, transitionSandbox } from "./state.js";

const stores: SqliteSandboxDemoStore[] = [];
function fixture() {
  const store = new SqliteSandboxDemoStore(":memory:");
  stores.push(store);
  return store;
}
afterEach(async () => { await Promise.all(stores.splice(0).map(store => store.close())); });
describe("durable isolated sandbox storage", () => {
  it("bootstraps each user exactly once and never mixes user records", async () => {
    const store = fixture(), alice = randomUUID(), bob = randomUUID();
    await store.bootstrap(alice); await store.bootstrap(bob);
    const planned = (await store.mutate(alice, current =>
      transitionSandbox(current, { kind: "plan", command: SANDBOX_COMMAND })))!;
    expect((await store.bootstrap(alice)).plan?.id).toBe(planned.plan?.id);
    expect((await store.find(bob))?.plan).toBeNull();
    expect(await store.mutate(randomUUID(), state => state)).toBeNull();
  });
  it("makes concurrent attempts exactly-once and safely resets only a simulated ledger", async () => {
    const store = fixture(), user = randomUUID();
    await store.bootstrap(user);
    const p = (await store.mutate(user, v => transitionSandbox(v, { kind: "plan", command: SANDBOX_COMMAND })))!;
    await Promise.all(Array.from({ length: 5 }, () => store.mutate(user, v =>
      transitionSandbox(v, { kind: "approve", planId: p.plan!.id, expectedPlanHash: p.plan!.planHash, acknowledged: true }))));
    await Promise.all(Array.from({ length: 8 }, () => store.mutate(user, v =>
      transitionSandbox(v, { kind: "execute", planId: p.plan!.id }))));
    const result = (await store.find(user))!;
    expect(result).toMatchObject({ providerBalance: 260000, internalAllocated: 20000, availableToSpend: 240000 });
    expect(result.activity).toHaveLength(2);
    expect(new Set(result.activity.map(a => a.reference)).size).toBe(2);
    const reset = await store.mutate(user, v => transitionSandbox(v, { kind: "reset", acknowledgment: "RESET_SIMULATED_WORKSPACE" }));
    expect(reset).toMatchObject({ providerBalance: 300000, internalAllocated: 0, resetCount: 1, plan: null, activity: [] });
  });
});
