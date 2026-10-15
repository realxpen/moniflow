import test from "node:test";
import assert from "node:assert/strict";
import { MONIFLOW_API, probeBmoniCloud } from "./bmoni-cloud-readonly-probe.mjs";

function fixture(replacements = {}) {
  const data = {
    "/health": [200, { status: "ok", service: "moniflow-api", environment: "production" }],
    "/health/bmoni": [200, { status: "ok", service: "bmoni", environment: "sandbox", currencies: ["CNGN"] }],
    "/health/provider": [200, { status: "ok", provider: "bmoni", simulated: false,
      partnerRegistrationEnabled: false }],
    ...replacements
  };
  const calls = [];
  const fetchImpl = async (url, options) => {
    assert.ok(url.startsWith(MONIFLOW_API));
    const path = url.slice(MONIFLOW_API.length);
    calls.push({ path, options });
    const [status, payload] = data[path];
    return new Response(JSON.stringify(payload), {
      status, headers: { "content-type": "application/json" }
    });
  };
  return { fetchImpl, calls };
}
function blocked(a) { return a.filter(x => !x.pass).map(x => x.check); }

test("cloud BMONI probe uses exactly three public GET endpoints and no secrets", async () => {
  const a = fixture();
  const results = await probeBmoniCloud(a.fetchImpl);
  assert.deepEqual(blocked(results), []);
  assert.deepEqual(a.calls.map(x => x.path), ["/health", "/health/bmoni", "/health/provider"]);
  for (const { options } of a.calls) {
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "manual");
    assert.deepEqual(options.headers, { accept: "application/json" });
    assert.equal(options.body, undefined);
    assert.equal(options.headers.authorization, undefined);
    assert.equal(options.headers["x-api-key"], undefined);
  }
});

test("refuses a dev runtime", async () => {
  const a = fixture({ "/health": [200, { status: "ok", service: "moniflow-api", environment: "development" }] });
  assert.ok(blocked(await probeBmoniCloud(a.fetchImpl)).includes("production-api"));
});

test("rejects simulated or inactive provider", async () => {
  const a = fixture({ "/health/bmoni": [200, {
    status: "inactive", service: "bmoni", reason: "not_selected", environment: "sandbox"
  }] });
  assert.ok(blocked(await probeBmoniCloud(a.fetchImpl)).includes("direct-bmoni-sandbox-connection"));
});

test("requires partner onboarding to stay blocked", async () => {
  const a = fixture({ "/health/provider": [200, {
    status: "ok", provider: "bmoni", simulated: false, partnerRegistrationEnabled: true
  }] });
  assert.ok(blocked(await probeBmoniCloud(a.fetchImpl)).includes("provider-identity-and-partner-gate"));
});

test("rejects provider response contract mismatch", async () => {
  const a = fixture({ "/health/bmoni": [200, {
    status: "ok", service: "bmoni", environment: "sandbox", currencies: "not-an-array"
  }] });
  assert.ok(blocked(await probeBmoniCloud(a.fetchImpl)).includes("direct-bmoni-sandbox-connection"));
});

test("fails safely when cloud network is unavailable, never retries", async () => {
  let count = 0;
  const results = await probeBmoniCloud(async () => {
    count++;
    throw new Error("secret credential was rejected");
  });
  assert.equal(count, 3);
  assert.equal(results.every(x => !x.pass), true);
  assert.doesNotMatch(JSON.stringify(results), /secret credential/);
});
