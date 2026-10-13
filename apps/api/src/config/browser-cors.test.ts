import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { attachBrowserCors } from "./browser-cors.js";

const apps: ReturnType<typeof Fastify>[] = [];

function testApp() {
  const app = Fastify();
  apps.push(app);
  attachBrowserCors(app, "https://moniflow-indol.vercel.app,http://localhost:8081");
  app.get("/health/provider", async () => ({ status: "ok" }));
  app.post("/api/operator/intent", async () => ({ intent: "UNSUPPORTED" }));
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("MONIFlow browser CORS policy", () => {
  it("permits public website origin on provider health", async () => {
    const response = await testApp().inject({
      method: "GET",
      url: "/health/provider",
      headers: { origin: "https://moniflow-indol.vercel.app" }
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("https://moniflow-indol.vercel.app");
    expect(response.headers.vary).toBe("Origin");
  });

  it("answers preflight for a permitted website POST", async () => {
    const response = await testApp().inject({
      method: "OPTIONS",
      url: "/api/operator/intent",
      headers: {
        origin: "https://moniflow-indol.vercel.app",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type"
      }
    });
    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
    expect(response.headers["access-control-allow-headers"]).toContain("Content-Type");
    expect(response.headers["access-control-allow-origin"]).toBe("https://moniflow-indol.vercel.app");
    expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("does not authorize unrelated browser origins", async () => {
    const app = testApp();
    const response = await app.inject({
      method: "GET",
      url: "/health/provider",
      headers: { origin: "https://unrelated.example" }
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    const preflight = await app.inject({
      method: "OPTIONS",
      url: "/api/operator/intent",
      headers: { origin: "https://unrelated.example", "access-control-request-method": "POST" }
    });
    expect(preflight.statusCode).toBe(403);
    expect(preflight.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("does not change native or server-to-server requests", async () => {
    const response = await testApp().inject({ method: "GET", url: "/health/provider" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
