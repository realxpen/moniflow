import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PostgresSandboxDemoStore } from "./workspace-store.js";
import { SANDBOX_COMMAND, transitionSandbox } from "./state.js";

// Runs only against the disposable PostgreSQL 16 CI service.
// NEVER point this integration test at an actual production database.
const enabled = process.env.MONIFLOW_B2_DISPOSABLE_DB_TESTS === "true" &&
  process.env.NODE_ENV === "test" &&
  (process.env.MONIFLOW_TEST_POSTGRES_URL ?? "").includes("127.0.0.1:5432/moniflow_b2_ci");
const integration = enabled ? describe : describe.skip;

integration("disposable PostgreSQL sandbox row-lock isolation", () => {
  it("persists across clients, serializes duplicate simulation, and never crosses users", async () => {
    const url = process.env.MONIFLOW_TEST_POSTGRES_URL!;
    const a = new PostgresSandboxDemoStore(url);
    const b = new PostgresSandboxDemoStore(url);
    try {
      const alice = randomUUID(), bob = randomUUID();
      await Promise.all([a.bootstrap(alice), b.bootstrap(bob)]);
      const plans = await Promise.all(Array.from({ length: 5 }, (_, i) =>
        (i % 2 ? a : b).mutate(alice, state => transitionSandbox(state, { kind: "plan", command: SANDBOX_COMMAND }))));
      const plan = plans[0]!.plan!;
      expect(new Set(plans.map(x => x?.plan?.id)).size).toBe(1);
      expect((await b.find(alice))?.plan?.id).toBe(plan.id);
      expect((await a.find(bob))?.plan).toBeNull();

      const approved = await b.mutate(alice, state => transitionSandbox(state, {
        kind: "approve", planId: plan.id, expectedPlanHash: plan.planHash, acknowledged: true
      }));
      expect(approved?.plan?.state).toBe("APPROVED");
      await Promise.all(Array.from({ length: 10 }, (_, i) =>
        (i % 2 ? a : b).mutate(alice, state => transitionSandbox(state, { kind: "execute", planId: plan.id }))));
      const saved = await a.find(alice);
      expect(saved).toMatchObject({
        providerBalance: 260000, internalAllocated: 20000, availableToSpend: 240000,
        plan: { state: "COMPLETED" }
      });
      expect(saved?.activity).toHaveLength(2);
      expect(new Set(saved?.activity.map(x => x.reference)).size).toBe(2);
      expect((await b.find(bob))?.providerBalance).toBe(300000);

      const replay = await b.mutate(alice, state => transitionSandbox(state, { kind: "execute", planId: plan.id }));
      expect(replay).toEqual(saved);
      const reset = await b.mutate(alice, state =>
        transitionSandbox(state, { kind: "reset", acknowledgment: "RESET_SIMULATED_WORKSPACE" }));
      expect(reset).toMatchObject({ providerBalance: 300000, resetCount: 1, plan: null, activity: [] });
      expect((await a.find(bob))?.resetCount).toBe(0);
      expect((await a.find(alice))?.resetCount).toBe(1);
    } finally {
      await Promise.all([a.close(), b.close()]);
    }
  });
});
