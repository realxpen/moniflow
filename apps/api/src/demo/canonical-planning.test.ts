import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../create-app.js";
import { createRepositories, type RepositorySet } from "../repositories/index.js";
import { BmoniUserService } from "../services/bmoni/user-service.js";
import { MoniflowSandboxProvider } from "../services/financial-provider/index.js";

let repositories: RepositorySet | null = null;
let app: ReturnType<typeof buildApp> | null = null;

afterEach(async () => {
  await app?.close();
  app = null;
  await repositories?.close();
  repositories = null;
});

describe("canonical MONIFlow sandbox planning", () => {
  it("bootstraps a clean demo and builds the expected guarded Money Plan", async () => {
    repositories = createRepositories(":memory:");
    const gateway = new MoniflowSandboxProvider();
    const userService = new BmoniUserService(gateway, repositories.users);

    app = buildApp({
      getBmoniGateway: () => gateway,
      getBmoniUserService: () => userService,
      getWalletOwnershipRepository: () => repositories!.wallets,
      getMoneyPlanRepository: () => repositories!.plans,
      getBankAccountRepository: () => repositories!.banks,
      getExecutionRepository: () => repositories!.executions,
      getPocketRepository: () => repositories!.pockets,
      getActivityRepository: () => repositories!.activities,
      ready: repositories.ready
    });
    await app.ready();

    const reset = await injectJson("POST", "/api/dev/reset", {});
    expect(reset.statusCode).toBe(201);
    expect(reset.body.provider).toMatchObject({ id: "moniflow-sandbox", simulated: true });
    expect(JSON.stringify(reset.body.balances)).toContain("300000.00");
    expect(reset.body.bankDestination.label).toBe("GTBank");
    expect(JSON.stringify(reset.body.nigeriaRail).toUpperCase()).toContain("ACTIVE");

    const localUserId = reset.body.identity.localUserId as string;
    const instruction = reset.body.canonicalInstruction as string;
    const parsed = await injectJson("POST", "/api/operator/intent", { input: instruction });
    expect(parsed.body.intent.intent).toBe("MULTI_ACTION");

    const planned = await injectJson("POST", "/api/operator/plan", {
      intent: parsed.body.intent,
      localUserId,
      originalInstruction: instruction
    });
    expect(planned.body.plan.currentAvailable).toBe(300_000);
    expect(planned.body.plan.totals.externalMovement).toBe(40_000);
    expect(planned.body.plan.totals.internalAllocation).toBe(20_000);
    expect(planned.body.plan.totals.availableAfter).toBe(240_000);
    expect(planned.body.accounting).toEqual({
      providerBalance: 300_000,
      internalAllocated: 0,
      availableToSpend: 300_000
    });

    const guarded = await injectJson("POST", `/api/operator/plans/${planned.body.planId}/guard`, { localUserId });
    expect(guarded.body.verdict).not.toBe("BLOCK");
    expect(["AWAITING_USER_APPROVAL", "APPROVED"]).toContain(guarded.body.status);
  });
});

type JsonPayload = Record<string, unknown>;

async function injectJson(method: "GET" | "POST", url: string, payload?: JsonPayload) {
  const response = payload === undefined
    ? await app!.inject({ method, url })
    : await app!.inject({ method, url, payload });
  const body = response.json();
  if (response.statusCode >= 400) {
    throw new Error(`${method} ${url} failed (${response.statusCode}): ${JSON.stringify(body)}`);
  }
  return { statusCode: response.statusCode, body };
}
