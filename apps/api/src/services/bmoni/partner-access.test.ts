import { describe, expect, it } from "vitest";
import { partnerRegistrationEnabled } from "./partner-access.js";

describe("partner sandbox registration gate", () => {
  it("locks BMONI registration while only shared sandbox credentials are available", () => {
    expect(partnerRegistrationEnabled("bmoni", "false")).toBe(false);
  });
  it("never treats the MONIFlow simulation as partner registration", () => {
    expect(partnerRegistrationEnabled("moniflow-sandbox", "true")).toBe(false);
  });
  it("requires an explicit server configuration change to enable BMONI registration", () => {
    expect(partnerRegistrationEnabled("bmoni", "true")).toBe(true);
  });
});
