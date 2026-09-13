import "dotenv/config";

const baseUrl = process.env.MONIFLOW_API_URL ?? `http://localhost:${process.env.API_PORT ?? "4000"}`;
const signature = `0x${"ab".repeat(65)}`;

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} failed (${response.status}): ${payload.message ?? JSON.stringify(payload)}`);
  }
  return payload;
}

const post = (path, body = {}) => request(path, { method: "POST", body: JSON.stringify(body) });
const get = (path) => request(path);

async function pollExecution(planId, localUserId, target, attempts = 10) {
  let snapshot;
  for (let index = 0; index < attempts; index += 1) {
    snapshot = await get(`/api/operator/plans/${encodeURIComponent(planId)}/execution/status?localUserId=${encodeURIComponent(localUserId)}`);
    if (target.includes(snapshot.execution?.state)) return snapshot.execution;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Execution did not reach ${target.join(" or ")}; last state: ${snapshot?.execution?.state ?? "unknown"}`);
}

function expectEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
}

async function run() {
  const bootstrap = await post("/api/dev/reset");
  const localUserId = bootstrap.identity.localUserId;
  const instruction = bootstrap.canonicalInstruction;

  const parsed = await post("/api/operator/intent", { input: instruction });
  expectEqual(parsed.intent.intent, "MULTI_ACTION", "intent");

  const planned = await post("/api/operator/plan", {
    intent: parsed.intent,
    localUserId,
    originalInstruction: instruction
  });
  expectEqual(planned.plan.currentAvailable, 300000, "initial spendable balance");
  expectEqual(planned.plan.totals.externalMovement, 40000, "withdrawal total");
  expectEqual(planned.plan.totals.internalAllocation, 20000, "allocation total");

  const guarded = await post(`/api/operator/plans/${planned.planId}/guard`, { localUserId });
  if (guarded.verdict === "BLOCK") throw new Error("MONI Guard blocked the canonical demo plan.");

  if (guarded.status === "AWAITING_USER_APPROVAL") {
    await post(`/api/operator/plans/${planned.planId}/approve`, {
      localUserId,
      expectedPlanHash: guarded.planHash
    });
  }

  let execution = (await post(`/api/operator/plans/${planned.planId}/execution/prepare`, { localUserId })).execution;
  if (execution.state !== "AWAITING_DEVICE_SIGNATURE") {
    execution = await pollExecution(planned.planId, localUserId, ["AWAITING_DEVICE_SIGNATURE"]);
  }

  await post(`/api/operator/plans/${planned.planId}/execution/sign`, {
    localUserId,
    proposalId: execution.proposalId,
    signature
  });

  await pollExecution(planned.planId, localUserId, ["COMPLETED"]);
  await post(`/api/operator/plans/${planned.planId}/execution/finalize`, { localUserId });
  await post(`/api/operator/plans/${planned.planId}/execution/finalize`, { localUserId });

  const [balancePayload, pocketsPayload, activityPayload] = await Promise.all([
    get(`/api/wallet/balance?localUserId=${encodeURIComponent(localUserId)}`),
    get(`/api/pockets?localUserId=${encodeURIComponent(localUserId)}`),
    get(`/api/activity?localUserId=${encodeURIComponent(localUserId)}`)
  ]);

  const laptop = pocketsPayload.pockets.find((pocket) => pocket.name === "Laptop");
  const relevantActivity = activityPayload.activity.filter((item) =>
    item.kind === "BANK_WITHDRAWAL" || item.kind === "POCKET_ALLOCATION"
  );

  expectEqual(balancePayload.balance.providerBalance, "260000.00", "provider balance");
  expectEqual(balancePayload.balance.internalAllocated, "20000.00", "internal allocations");
  expectEqual(balancePayload.balance.availableToSpend, "240000.00", "available to spend");
  expectEqual(laptop?.allocatedAmount, 20000, "Laptop pocket allocation");
  expectEqual(relevantActivity.length, 2, "financial memory entries");

  console.log(JSON.stringify({
    status: "PASS",
    provider: bootstrap.provider,
    localUserId,
    instruction,
    planId: planned.planId,
    result: {
      withdrawal: 40000,
      laptopAllocation: 20000,
      providerBalance: balancePayload.balance.providerBalance,
      internalAllocated: balancePayload.balance.internalAllocated,
      availableToSpend: balancePayload.balance.availableToSpend,
      financialMemoryEntries: relevantActivity.length
    }
  }, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
