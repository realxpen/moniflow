import { describe, expect, it } from "vitest";
import { walkthroughNumbers, walkthroughScenario, walkthroughStages } from "./walkthrough";

describe("isolated MONIFlow educational walkthrough", () => {
  it("reconciles provider and internal allocations without inventing wallet state", () => {
    expect(walkthroughNumbers()).toEqual({ providerAfter: 260000, availableAfter: 240000, totalCommitted: 60000 });
    expect(walkthroughScenario.simulated).toBe(true);
  });
  it("includes the human-control and no-real-transfer disclosures", () => {
    expect(walkthroughStages.some(step => step.id === "approval" && step.detail.includes("cannot grant consent"))).toBe(true);
    expect(walkthroughStages.some(step => step.id === "execution" && step.detail.includes("No BMONI request"))).toBe(true);
  });
});
