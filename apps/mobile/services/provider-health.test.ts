import { describe, expect, it } from "vitest";
import { providerHealthBadge, providerHealthProblem } from "./provider-health";

describe("truthful provider readiness", () => {
  it("separates missing partner credentials from connectivity", () => {
    const issue = providerHealthProblem(503, { reason: "not_configured" });
    expect(issue.reason).toBe("not_configured");
    expect(issue.message).toContain("credentials");
  });
  it("separates provider contract problems from authentication", () => {
    const issue = providerHealthProblem(502, { reason: "contract_mismatch" });
    expect(issue.message).toContain("unexpected data");
  });
  it("never reports provider readiness on HTTP 503", () => {
    expect(providerHealthBadge("bmoni", "unavailable")).toBe("BMONI UNAVAILABLE");
    expect(providerHealthBadge("moniflow-sandbox", "unavailable")).toBe("MONIFLOW SANDBOX UNAVAILABLE");
    expect(providerHealthBadge("bmoni", "ok")).toBe("BMONI SANDBOX");
  });
  it("labels blocked API health as access trouble, not BMONI trouble", () => {
    expect(providerHealthProblem(403, {}).reason).toBe("api_access");
  });
});
