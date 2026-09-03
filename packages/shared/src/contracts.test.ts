import { describe, expect, it } from "vitest";

import { moneyPlanStatusSchema, supportedIntentSchema } from "./index";

describe("shared financial contracts", () => {
  it("accepts only a supported intent", () => {
    expect(supportedIntentSchema.parse("MULTI_ACTION")).toBe("MULTI_ACTION");
    expect(supportedIntentSchema.safeParse("SEND_ANYTHING").success).toBe(false);
  });

  it("accepts only a declared Money Plan state", () => {
    expect(moneyPlanStatusSchema.parse("AWAITING_USER_APPROVAL")).toBe(
      "AWAITING_USER_APPROVAL"
    );
    expect(moneyPlanStatusSchema.safeParse("PAID").success).toBe(false);
  });
});
