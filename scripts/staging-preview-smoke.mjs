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
    console.log("PASS", method, path, "HTTP", response.status);
  } finally {
    clearTimeout(timer);
  }
}

await expectStatus("/health", "GET", 200);
await expectStatus("/api/sandbox-demo/status", "GET", 401);
await expectStatus("/api/sandbox-demo/bootstrap", "POST", 401);
await expectStatus("/api/onboarding/nigeria/start", "POST", 401);
await expectStatus("/api/operator/plans", "POST", 401);
// No bearer token, no KYC documents, no provider calls, no financial writes.
console.log("PASS isolated preview public-health and JWT protection perimeter");
