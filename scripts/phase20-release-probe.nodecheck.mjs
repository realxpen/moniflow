import test from "node:test";
import assert from "node:assert/strict";
import { probePhase20, PRODUCTION_API, PRODUCTION_WEB } from "./phase20-release-probe.mjs";

function fakeResponses(changes = {}) {
  const routes = {
    [PRODUCTION_API + "/health"]: [200, { status: "ok", service: "moniflow-api", environment: "production" }],
    [PRODUCTION_API + "/health/provider"]: [200, {
      status: "ok", service: "financial-provider",
      partnerRegistrationEnabled: false, authenticatedSandboxDemoEnabled: true
    }],
    [PRODUCTION_API + "/api/sandbox-demo/status"]: [401, { code: "AUTH_REQUIRED" }],
    [PRODUCTION_WEB + "/demo/live"]: [200, "<html>MONIFlow</html>"],
    ...changes
  };
  const calls = [];
  async function fetchImpl(url, init) {
    calls.push({ url, init });
    const match = routes[url];
    if (!match) throw new Error("Unexpected endpoint: " + url);
    const [status, body] = match;
    return new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status, headers: { "content-type": typeof body === "string" ? "text/html" : "application/json" }
    });
  }
  return { fetchImpl, calls };
}
function failed(checks) { return checks.filter(check => !check.ok).map(check => check.name); }

test("all seven production release checks pass for the correct public contract", async () => {
  const fixture = fakeResponses();
  const checks = await probePhase20({ fetchImpl: fixture.fetchImpl });
  assert.equal(checks.length, 7);
  assert.deepEqual(failed(checks), []);
  assert.equal(fixture.calls.length, 4);
  for (const { url, init } of fixture.calls) {
    assert.equal(init.method, "GET");
    assert.equal(init.redirect, "manual");
    assert.deepEqual(init.headers, { accept: "application/json" });
    assert.ok(url.startsWith("https://"));
    assert.ok(!("body" in init) && !("authorization" in init.headers));
  }
});

test("never accepts a development API as production", async () => {
  const { fetchImpl } = fakeResponses({
    [PRODUCTION_API + "/health"]: [200, { status: "ok", service: "moniflow-api", environment: "development" }]
  });
  assert.ok(failed(await probePhase20({ fetchImpl })).includes("API production health"));
});

test("partner onboarding must stay locked, even if provider reports healthy", async () => {
  const { fetchImpl } = fakeResponses({
    [PRODUCTION_API + "/health/provider"]: [200, {
      status: "ok", partnerRegistrationEnabled: true, authenticatedSandboxDemoEnabled: true
    }]
  });
  assert.ok(failed(await probePhase20({ fetchImpl })).includes("Partner onboarding stays locked"));
});

test("sandbox availability must be explicitly advertised", async () => {
  const { fetchImpl } = fakeResponses({
    [PRODUCTION_API + "/health/provider"]: [200, {
      status: "ok", partnerRegistrationEnabled: false, authenticatedSandboxDemoEnabled: false
    }]
  });
  assert.ok(failed(await probePhase20({ fetchImpl })).includes("Authenticated sandbox advertised"));
});

test("a sandbox status response without authentication must be 401", async () => {
  const { fetchImpl } = fakeResponses({
    [PRODUCTION_API + "/api/sandbox-demo/status"]: [200, { simulated: true }]
  });
  assert.ok(failed(await probePhase20({ fetchImpl })).includes("Unauthenticated sandbox isolation"));
});

test("provider degradation and missing web page fail the release gate", async () => {
  const { fetchImpl } = fakeResponses({
    [PRODUCTION_API + "/health/provider"]: [503, {
      status: "unavailable", partnerRegistrationEnabled: false, authenticatedSandboxDemoEnabled: true
    }],
    [PRODUCTION_WEB + "/demo/live"]: [404, "Not Found"]
  });
  const failures = failed(await probePhase20({ fetchImpl }));
  assert.ok(failures.includes("Financial provider readiness"));
  assert.ok(failures.includes("Web demo route"));
});

test("bad origins fail without issuing any requests", async () => {
  const fixture = fakeResponses();
  const checks = await probePhase20({ api: "http://insecure.example", fetchImpl: fixture.fetchImpl });
  assert.deepEqual(failed(checks), ["HTTPS origins"]);
  assert.equal(fixture.calls.length, 0);
});

test("network failure is safely reported and never interpreted as success", async () => {
  const fixture = fakeResponses();
  const checks = await probePhase20({ fetchImpl: async (...args) => {
    if (args[0] === PRODUCTION_API + "/health") throw new Error("network down");
    return fixture.fetchImpl(...args);
  } });
  assert.ok(failed(checks).includes("API production health"));
});
