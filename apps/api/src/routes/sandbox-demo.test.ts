import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { attachUserAuthorization } from "../security/user-authorization.js";
import { SqliteSandboxDemoStore } from "../services/sandbox-demo/workspace-store.js";
import { SANDBOX_COMMAND } from "../services/sandbox-demo/state.js";
import { authenticatedSandboxDemoRoutes } from "./sandbox-demo.js";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const apps: ReturnType<typeof Fastify>[] = [];
const signed = (userId: string) => ({ authorization: "Bearer " + userId });

function setup() {
  const app = Fastify({ logger: false });
  const store = new SqliteSandboxDemoStore(":memory:");
  attachUserAuthorization(app, { audience: "authenticated" }, async token => {
    if (token !== alice && token !== bob) throw new Error("INVALID_TOKEN");
    return { userId: token };
  });
  app.register(authenticatedSandboxDemoRoutes, {
    prefix: "/api/sandbox-demo",
    store,
    getVerifiedUserId: (request) => {
      // Production passes ONLY getAuthenticatedUserId(request).
      return getVerifiedFixtureUserId(request);
    }
  });
  app.addHook("onClose", async () => store.close());
  apps.push(app);
  const request = (method: "GET" | "POST", path: string, asUser?: string, payload?: unknown) =>
    app.inject({
      method, url: "/api/sandbox-demo" + path,
      ...(asUser ? { headers: signed(asUser) } : {}),
      ...(payload ? { payload } : {})
    });
  return { app, request };
}

// In tests the ID is extracted only from the identity that was authenticated
// by the test verifier; the production route never sees caller-selected IDs.
import { getAuthenticatedUserId as getVerifiedFixtureUserId } from "../security/user-authorization.js";

afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });

describe("JWT-bound authenticated financial sandbox endpoints", () => {
  it("requires actual verification and doesn't allow anonymous bootstrap or status", async () => {
    const { request } = setup();
    expect((await request("POST", "/bootstrap")).statusCode).toBe(401);
    expect((await request("GET", "/status")).statusCode).toBe(401);
    expect((await request("POST", "/bootstrap", "bad-token")).statusCode).toBe(401);
  });

  it("persists real parser + Guard plan, requires consent and simulates only once", async () => {
    const { request } = setup();
    const started = await request("POST", "/bootstrap", alice);
    expect(started.statusCode).toBe(200);
    expect(started.json()).toMatchObject({ simulated: true, providerBalance: 300000, internalAllocated: 0 });
    const planned = await request("POST", "/plan", alice, { command: SANDBOX_COMMAND });
    expect(planned.statusCode).toBe(200);
    const state = planned.json();
    expect(state.plan.verdict.verdict).toBe("REVIEW");
    expect(state.plan.verdict.checks).toHaveLength(8);
    const id = state.plan.id;
    expect((await request("POST", "/plans/" + id + "/simulate", alice)).statusCode).toBe(409);
    expect((await request("POST", "/plans/" + id + "/approve", alice,
      { expectedPlanHash: state.plan.planHash, acknowledged: false })).statusCode).toBe(400);
    expect((await request("POST", "/plans/" + id + "/approve", alice,
      { expectedPlanHash: "a".repeat(64), acknowledged: true })).statusCode).toBe(409);
    const authorized = await request("POST", "/plans/" + id + "/approve", alice,
      { expectedPlanHash: state.plan.planHash, acknowledged: true });
    expect(authorized.statusCode).toBe(200);
    expect(authorized.json().plan.state).toBe("APPROVED");

    const finished = await Promise.all(Array.from({ length: 6 }, () =>
      request("POST", "/plans/" + id + "/simulate", alice)));
    expect(finished.every(r => r.statusCode === 200)).toBe(true);
    const saved = (await request("GET", "/status", alice)).json();
    expect(saved).toMatchObject({
      simulated: true, providerBalance: 260000, internalAllocated: 20000,
      availableToSpend: 240000, plan: { state: "COMPLETED" }
    });
    expect(saved.activity).toHaveLength(2);
    expect(new Set(saved.activity.map((item: { reference: string }) => item.reference)).size).toBe(2);
    expect((await request("POST", "/plan", alice, { command: SANDBOX_COMMAND })).json().plan.id).toBe(id);
    expect((await request("POST", "/bootstrap", alice)).json().plan.id).toBe(id);
  });

  it("isolates all accounts and rejects cross-user plan IDs", async () => {
    const { request } = setup();
    await request("POST", "/bootstrap", alice);
    await request("POST", "/bootstrap", bob);
    const plan = (await request("POST", "/plan", alice, { command: SANDBOX_COMMAND })).json().plan;
    expect((await request("GET", "/status", bob)).json().plan).toBeNull();
    const stolen = await request("POST", "/plans/" + plan.id + "/approve", bob,
      { expectedPlanHash: plan.planHash, acknowledged: true });
    expect(stolen.statusCode).toBe(404);
    expect((await request("POST", "/plans/" + plan.id + "/simulate", bob)).statusCode).toBe(404);
    expect((await request("GET", "/status", alice)).json().plan.id).toBe(plan.id);
  });

  it("only resets after an explicit phrase and doesn't reset a different user", async () => {
    const { request } = setup();
    await request("POST", "/bootstrap", alice);
    await request("POST", "/bootstrap", bob);
    const planned = (await request("POST", "/plan", alice, { command: SANDBOX_COMMAND })).json();
    expect((await request("POST", "/reset", alice, { acknowledgment: "reset" })).statusCode).toBe(400);
    const reset = await request("POST", "/reset", alice, { acknowledgment: "RESET_SIMULATED_WORKSPACE" });
    expect(reset.statusCode).toBe(200);
    expect(reset.json()).toMatchObject({ resetCount: 1, plan: null, providerBalance: 300000, activity: [] });
    expect((await request("GET", "/status", bob)).json().resetCount).toBe(0);
    expect((await request("POST", "/plans/" + planned.plan.id + "/simulate", alice)).statusCode).toBe(404);
  });
});
