import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../create-app.js";
import { deriveNigeriaStatus } from "./nigeria-onboarding.js";

const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("BMONI Nigeria onboarding requires explicit partner access", () => {
  it.each([
    "/api/onboarding/nigeria/start",
    "/api/onboarding/nigeria/documents",
    "/api/onboarding/nigeria/activate"
  ])("rejects POST %s before parsing forms, reading an identity or invoking BMONI", async (url) => {
    // Deliberately use the ordinary runtime app under NODE_ENV=test.
    // Tests must never grant partner access merely because a test is running.
    const app = buildApp();
    apps.push(app);
    const response = await app.inject({
      method: "POST",
      url,
      payload: { localUserId: "11111111-1111-4111-8111-111111111111" }
    });
    expect(response.statusCode).toBe(423);
    expect(response.json()).toEqual({
      statusCode: 423,
      error: "Locked",
      provisioningState: "PARTNER_ACCESS_PENDING",
      retryable: false,
      message: "BMONI Nigeria KYC and rail activation require approved partner sandbox access."
    });
    expect(response.body).not.toMatch(/x-api-key|BMONI_API_KEY|bvn|privateKey|smartWalletAddress/);
  });

  it("keeps read-only status validation separate from partner KYC writes", async () => {
    const app = buildApp();
    apps.push(app);
    const response = await app.inject({
      method: "GET", url: "/api/onboarding/nigeria/status?localUserId=invalid"
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe("localUserId must be a UUID.");
  });
});

describe("no false-positive Nigeria rail readiness", () => {
  it.each(["active", "completed", "ready", " READY "])("accepts an explicit provider status %s", status => {
    expect(deriveNigeriaStatus({ status })).toBe("ready");
  });

  it.each(["failed", "rejected", "error"])("treats explicit %s as failure", status => {
    expect(deriveNigeriaStatus({ status })).toBe("failed");
  });

  it.each(["action_required", "documents_required", "required"])("flags explicit %s as action needed", status => {
    expect(deriveNigeriaStatus({ status })).toBe("action_required");
  });

  it("does not treat hints and nested words as provider confirmation", () => {
    for (const value of [
      {},
      { message: "Ready to create a bank account after KYC" },
      { next: "completed" },
      { kyc: { status: "ready" } },
      { data: { status: "active" } },
      { status: "pending", note: "already completed" },
      { status: "not_ready" },
      { status: "processing", error: "ready" },
      { status: { rail: "ready" } },
      { status: true }
    ]) {
      expect(deriveNigeriaStatus(value)).toBe("processing");
    }
  });
});
