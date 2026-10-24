/**
 * Out-of-process smoke for the isolated Vercel preview. This script must NOT
 * carry a user bearer token or send a request capable of financial execution.
 * Full signed-in canonical sandbox tests run with disposable credentials in CI.
 */
const host = "moniflow-sandbox-staging-git-rc-moni-312569-swifnatechnologyltd.vercel.app";
const base = "https://" + host;

async function expectStatus(path, method, wanted) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(base + path, {
      method, redirect: "manual", signal: controller.signal,
      headers: { accept: "application/json" },
      ...(method === "POST" ? { headers: { "content-type": "application/json", accept: "application/json" }, body: "{}" } : {})
    });
    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";
    if (response.status !== wanted || !contentType.includes("application/json") ||
        text.includes("<!DOCTYPE html>") || text.includes("vercel_sso") ||
        text.includes("Authentication Required")) {
      throw new Error("Staging " + method + " " + path +
        " did not return expected JSON HTTP " + wanted +
        " (got status " + response.status + ", content type " + contentType + ")");
    }
    const parsed = JSON.parse(text);
    if (wanted === 401 && parsed?.code !== "AUTH_REQUIRED") {
      throw new Error("Missing JWT guard on " + path);
    }
    if (wanted === 200 && !parsed?.status) {
      throw new Error("Health response is missing its status.");
    }
    if (path === "/health/provider" && (
      parsed.provider !== "moniflow-sandbox" ||
      parsed.simulated !== true ||
      parsed.authenticatedSandboxDemoEnabled !== true ||
      parsed.partnerRegistrationEnabled !== false
    )) {
      throw new Error("Wrong provider mode, sandbox capability or partner access state.");
    }
    console.log("PASS", method, path, "HTTP", response.status);
  } finally {
    clearTimeout(timer);
  }
}

await expectStatus("/health", "GET", 200);
await expectStatus("/health/provider", "GET", 200);
await expectStatus("/api/sandbox-demo/status", "GET", 401);
await expectStatus("/api/sandbox-demo/bootstrap", "POST", 401);
await expectStatus("/api/onboarding/nigeria/start", "POST", 401);
await expectStatus("/api/operator/plans", "POST", 401);
/**
 * The PWA's very first provider health check is a cross-origin browser GET.
 * Native Android apps do not enforce CORS, so previously-green Android and
 * server tests cannot prove Safari can reach this provider.
 *
 * Test one exact reviewed origin, preflight and protected responses from the
 * GitHub runner without accounts or bearer tokens. If this fails, the iPhone
 * will surface a generic "failed to fetch" even while the API reports READY.
 */
const pwaOrigins = [
  "https://xpen-moniflow-pwa-202610--n9px8b7cup.expo.app",
  "https://xpen-moniflow-pwa-202610--7emunmce6e.expo.app",
  "https://xpen-moniflow-pwa-202610--30ngd54vd2.expo.app",
  "https://xpen-moniflow-pwa-202610--vxgwelbarp.expo.app"
];
async function assertCors(path, method, headers, expected, expectedOrigin) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const res = await fetch(base + path, {
      method,
      headers,
      redirect: "manual",
      signal: controller.signal
    });
    const allow = res.headers.get("access-control-allow-origin");
    const credentials = res.headers.get("access-control-allow-credentials");
    const vary = res.headers.get("vary") || "";
    if (res.status !== expected || allow !== expectedOrigin || credentials === "true" ||
        !vary.toLowerCase().includes("origin")) {
      throw new Error("Safari browser barrier on " + method + " " + path +
        ": HTTP " + res.status + ", allow-origin " + (allow ?? "(missing)") +
        ", expected origin " + (expectedOrigin ?? "(no origin)") + ".");
    }
    if (method === "OPTIONS" && expectedOrigin) {
      const methods = res.headers.get("access-control-allow-methods") || "";
      const allowedHeaders = res.headers.get("access-control-allow-headers") || "";
      if (!methods.includes("POST") || !allowedHeaders.toLowerCase().includes("authorization")) {
        throw new Error("Safari protected sandbox CORS preflight headers incomplete");
      }
    }
    console.log("PASS", method, path, "Safari browser origin", expected);
  } finally {
    clearTimeout(timer);
  }
}

// Preserve old installed iPhone PWA access while separately admitting the
// approved session-restoration preview origin; each must still pass JWT gates.
for (const pwaOrigin of pwaOrigins) {
  await assertCors("/health/provider", "GET",
    { origin: pwaOrigin, accept: "application/json" }, 200, pwaOrigin);
  await assertCors("/api/sandbox-demo/status", "GET",
    { origin: pwaOrigin, accept: "application/json" }, 401, pwaOrigin);
  // OPTIONS is a browser permission check, NOT a money-plan mutation.
  await assertCors("/api/sandbox-demo/bootstrap", "OPTIONS",
    { origin: pwaOrigin, "access-control-request-method": "POST",
      "access-control-request-headers": "authorization,content-type" }, 204, pwaOrigin);
}
// Unknown websites must never inherit authenticated browser access.
await assertCors("/health/provider", "GET",
  { origin: "https://untrusted.example", accept: "application/json" }, 200, null);

// No bearer token, no KYC documents, no provider calls, no financial writes.
console.log("PASS isolated preview public-health and JWT protection perimeter");
