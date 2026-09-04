import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("POST /api/operator/intent", () => {
  it("returns a strict validated bank withdrawal", async () => {
    const app = buildApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/operator/intent",
      payload: { input: "Withdraw ₦40,000 to my GTBank account" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      intent: {
        intent: "BANK_WITHDRAWAL",
        currency: "NGN",
        amount: 40000,
        destination: { kind: "SAVED_BANK", label: "GTBank" },
        requiresApproval: true
      }
    });
  });

  it("returns MULTI_ACTION only when every clause is supported", async () => {
    const app = buildApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/operator/intent",
      payload: { input: "Withdraw ₦40k to GTBank and save ₦20k for laptop" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().intent.intent).toBe("MULTI_ACTION");
    expect(response.json().intent.actions).toHaveLength(2);
  });

  it("returns UNSUPPORTED instead of guessing", async () => {
    const app = buildApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/operator/intent",
      payload: { input: "Move some money somewhere useful" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      intent: {
        intent: "UNSUPPORTED",
        requiresApproval: false,
        reason: "UNSUPPORTED_ACTION"
      }
    });
  });
});
