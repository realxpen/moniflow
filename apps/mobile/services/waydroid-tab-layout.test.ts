import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = (path: string) => readFileSync(`apps/mobile/${path}`, "utf8");

describe("Waydroid Figma v6 tab review — read-only UI and system navigation", () => {
  it("keeps the floating tab bar above the Android safe-area bottom edge", () => {
    const navigation = component("app/(tabs)/_layout.tsx");
    const screen = component("components/ui/Screen.tsx");
    expect(navigation).toContain('import { useSafeAreaInsets } from "react-native-safe-area-context"');
    expect(navigation).toContain("bottom: spacing.sm + insets.bottom");
    expect(navigation).not.toContain("bottom: spacing.sm,");
    expect(navigation).toContain('accessibilityRole="tab"');
    expect(navigation).toContain("accessibilityLabel=");
    expect(screen).toContain('edges={["top", "bottom", "left", "right"]}');
  });

  it("prioritizes Pockets/Activity content instead of repeating full readiness first", () => {
    const workspace = component("components/AuthenticatedWorkspace.tsx");
    expect(workspace).toContain('tab === "home" ? (');
    expect(workspace).not.toContain('tab !== "profile" ? (');
    expect(workspace).toContain('tab === "pockets" || tab === "activity"');
    expect(workspace).toContain("<ReadOnlyFinancialPanel");
    expect(workspace).toContain('"/learn/playground"');
    expect(workspace).toContain('"/demo/walkthrough"');
    expect(workspace).toContain('router.push("/(tabs)/profile")');
    expect(workspace).toContain("Provider data remains withheld");
    expect(workspace).toContain("<ProfileReadinessPanel");
    expect(workspace.indexOf("<ReadOnlyFinancialPanel")).toBeLessThan(
      workspace.indexOf("Review readiness in Profile")
    );
  });

  it("preserves owner-bound API reads, auth fences, profile review and sign-out", () => {
    const workspace = component("components/AuthenticatedWorkspace.tsx");
    expect(workspace).toContain("selectVisibleOwnerSnapshot(auth?.userId, snapshot)");
    expect(workspace).toContain("canApplyOwnerRequest(");
    expect(workspace).toContain('if (tab === "profile")');
    expect(workspace).toContain("loadAccountReconciliation(next)");
    expect(workspace).toContain("requestSequence.current += 1;");
    expect(workspace).toContain("signOut();");
    expect(workspace).not.toContain("loadWalletBalance(");
    expect(workspace).not.toContain("runMoniGuard(");
    expect(workspace).not.toContain("approvePlan(");
    expect(workspace).not.toContain("signTransactionHash(");
  });
});
