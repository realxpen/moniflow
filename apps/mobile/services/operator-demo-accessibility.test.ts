import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("apps/mobile/app/demo/operator.tsx", "utf8");

describe("Waydroid interactive demo acknowledgement", () => {
  it("exposes a checked state, readable meaning and visible check indicator", () => {
    expect(source).toContain('accessibilityRole="checkbox" accessibilityState={{ checked }}');
    expect(source).toContain('accessibilityLabel="I understand this is an offline demonstration, not a real financial approval"');
    expect(source).toContain('checked ? <Text style={styles.checkmark}>✓</Text> : null');
    expect(source).toContain("minHeight: 44");
  });

  it("refuses simulated progression until the checkbox is explicitly acknowledged", () => {
    expect(source).toContain('disabled={!checked} onPress={() => act({ type: "APPROVE_SIMULATION", acknowledged: checked })}');
    expect(source).toContain("Confirm demo only · no payment");
    expect(source).toContain("NO FINANCIAL EXECUTION");
    expect(source).toContain("SIMULATED RESULT · NOT SETTLED");
    expect(source).toContain("No BMONI API request, bank verification, financial approval");
  });

  it("keeps the interactive demo isolated from real provider and banking modules", () => {
    expect(source).not.toMatch(/from ["']@\/services\/(?:api-fetch|bmoni-device|wallet-dashboard|money-plan|approval|banking|sandbox-api)["']/);
    expect(source).not.toMatch(/signTransactionHash|approvePlan\(|initWallet\(/);
  });
});
