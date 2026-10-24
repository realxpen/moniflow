import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = "apps/mobile/";
const src = (p: string) => readFileSync(root + p, "utf8");

describe("iPhone PWA full-height money-plan readability", () => {
  it("reserves flow layout space for PWA tabs instead of overlaying long Guard text", () => {
    const tabs = src("app/(tabs)/_layout.tsx");
    expect(tabs).toContain('Platform.OS === "web"');
    expect(tabs).toContain("styles.webShell");
    expect(tabs).toContain('position: "relative"');
    expect(tabs).toContain('paddingBottom: spacing.sm + insets.bottom');
    expect(tabs).toContain("backgroundColor: colors.backgroundPrimary");
    expect(tabs).toContain("styles.shell");
    // Keep the original native design; only the browser gets a non-overlapping bar.
    expect(tabs).toContain('position: "absolute"');
    expect(tabs).toContain("bottom: spacing.sm + insets.bottom");
    for (const tab of ["home", "pockets", "activity", "profile"]) {
      expect(tabs).toContain('name="' + tab + '"');
    }
  });

  it.each([
    "components/workspace/ServerSandboxWorkspace.tsx",
    "components/workspace/FigmaPreviewWorkspace.tsx",
    "components/AuthenticatedWorkspace.tsx"
  ])("uses smaller in-flow web padding but retains native tab clearance: %s", file => {
    const content = src(file);
    expect(content).toContain('paddingBottom: Platform.OS === "web" ? spacing.lg : layout.tabContentBottomInset');
    expect(content).toContain("contentContainerStyle={styles.");
  });

  it("leaves exact simulation approval, Guard status and real-money lock untouched", () => {
    const screen = src("components/workspace/ServerSandboxWorkspace.tsx");
    expect(screen).toContain("Acknowledge exact plan · demo only");
    expect(screen).toContain("MONI GUARD");
    expect(screen).toContain("SIMULATED · NOT SETTLED");
    expect(screen).toContain("NO PROVIDER SIGNATURE · NO REAL MONEY");
    expect(screen).toContain("applySnapshot");
  });
});
