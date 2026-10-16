import { describe, expect, it } from "vitest";
import { evaluateNativeLaunchReadiness } from "./native-launch-readiness";

describe("Phase 28 native launch and provider readiness", () => {
  it("does not offer working sign-in when EAS has no public auth config", () => {
    const result = evaluateNativeLaunchReadiness({
      authConfigured: false, provider: "bmoni", providerConnected: true,
      partnerRegistrationEnabled: false
    });
    expect(result).toMatchObject({
      canOfferSignIn: false,
      signInLabel: "SIGN-IN SETUP REQUIRED",
      providerLabel: "CONNECTIVITY ONLY",
      walletVerified: false
    });
  });

  it("never confuses configured sign-in or health with an owned BMONI wallet", () => {
    const result = evaluateNativeLaunchReadiness({
      authConfigured: true, provider: "bmoni", providerConnected: true,
      partnerRegistrationEnabled: true
    });
    expect(result.canOfferSignIn).toBe(true);
    expect(result.providerLabel).toBe("REGISTRATION CONFIGURED");
    expect(result.walletVerified).toBe(false);
  });

  it("distinguishes unknown and offline providers from health", () => {
    expect(evaluateNativeLaunchReadiness({
      authConfigured: true, provider: null, providerConnected: false,
      partnerRegistrationEnabled: false
    }).providerLabel).toBe("PROVIDER UNKNOWN");
    expect(evaluateNativeLaunchReadiness({
      authConfigured: true, provider: "bmoni", providerConnected: false,
      partnerRegistrationEnabled: true
    }).providerLabel).toBe("PROVIDER OFFLINE");
    expect(evaluateNativeLaunchReadiness({
      authConfigured: true, provider: "moniflow-sandbox", providerConnected: true,
      partnerRegistrationEnabled: false
    }).walletVerified).toBe(false);
  });
});
