import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { learningReturnRoute, learningSafety, learningSteps } from "./learning-mode";

const read = (path: string) => readFileSync(path, "utf8");

describe("Phase 33D Learning & Practice - educational-only boundaries", () => {
  it("describes the intended six stages without falsely claiming execution", () => {
    expect(learningSteps.map(s => s.id)).toEqual([
      "intent", "plan", "guard", "review", "verification", "memory"
    ]);
    expect(new Set(learningSteps.map(s => s.number)).size).toBe(6);
    expect(learningSteps.find(s => s.id === "verification")?.description).toMatch(/genuine provider response/);
    expect(learningSteps.find(s => s.id === "memory")?.description).toMatch(/temporary illustrations/);
  });

  it("keeps every provider, signing, persistence and money feature disabled", () => {
    expect(learningSafety).toEqual({
      simulated: true,
      providerConnected: false,
      walletSigningEnabled: false,
      financialOperationsEnabled: false,
      persistsAccountData: false
    });
  });

  it("returns authenticated users to the guarded workspace without identity query strings", () => {
    expect(learningReturnRoute(true)).toBe("/(tabs)/home");
    expect(learningReturnRoute(false)).toBe("/onboarding/welcome");
    expect(learningReturnRoute(true)).not.toMatch(/\?|userId|token/);
  });

  it("does not import API, identity, banking, wallet, or financial-signing code in the learning route", () => {
    const route = read("apps/mobile/app/learn/index.tsx");
    const policy = read("apps/mobile/services/learning-mode.ts");
    expect(route).toContain("OFFLINE PRACTICE · NO REAL FUNDS");
    expect(route).toContain('router.push("/demo/walkthrough")');
    expect(route).toContain('router.push("/demo/operator")');
    expect(route).toContain("learningReturnRoute(Boolean(auth))");
    expect(route + policy).not.toMatch(/from ["']@\/services\/(?:api-fetch|bmoni-device|banking|execution|money-plan|approval|wallet-dashboard|sandbox-api)["']/);
    expect(route + policy).not.toMatch(/fetch\(|AsyncStorage|signTransactionHash|setPin\(|initWallet\(/);
  });

  it("exposes practice to signed-in Home and anonymous welcome without financial authorization", () => {
    const home = read("apps/mobile/components/AuthenticatedWorkspace.tsx");
    const welcome = read("apps/mobile/app/onboarding/welcome.tsx");
    expect(home).toMatch(/tab === "home"[\s\S]*?LEARN & PRACTICE[\s\S]*?router\.push\("\/learn"\)/);
    expect(welcome).toContain('router.push("/learn")');
  });

  it("routes educational exits to the hub instead of resetting an authenticated account", () => {
    for (const path of ["apps/mobile/app/demo/operator.tsx", "apps/mobile/app/demo/walkthrough.tsx"]) {
      const code = read(path);
      expect(code).toContain('router.replace("/learn")');
      expect(code).toContain("Return to Learning & Practice");
      expect(code).not.toContain('router.replace("/onboarding/welcome")');
    }
  });
});
