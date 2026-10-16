/**
 * Read-only launch readiness for production/preview native builds.
 * A configured public sign-in endpoint is not an authenticated session;
 * BMONI connectivity is not an owned user mapping or a managed wallet.
 */
export type NativeLaunchReadiness = {
  signInConfigured: boolean;
  signInLabel: "SIGN-IN CONFIGURED" | "SIGN-IN SETUP REQUIRED";
  canOfferSignIn: boolean;
  providerLabel: "PROVIDER UNKNOWN" | "PROVIDER OFFLINE" | "CONNECTIVITY ONLY" | "REGISTRATION CONFIGURED";
  walletVerified: false;
};

export function evaluateNativeLaunchReadiness(input: {
  authConfigured: boolean;
  provider: "bmoni" | "moniflow-sandbox" | null;
  providerConnected: boolean;
  partnerRegistrationEnabled: boolean;
}): NativeLaunchReadiness {
  const canOfferSignIn = input.authConfigured;
  const providerLabel =
    !input.provider ? "PROVIDER UNKNOWN" :
    !input.providerConnected ? "PROVIDER OFFLINE" :
    input.provider === "bmoni" && input.partnerRegistrationEnabled
      ? "REGISTRATION CONFIGURED"
      : "CONNECTIVITY ONLY";
  return {
    signInConfigured: canOfferSignIn,
    signInLabel: canOfferSignIn ? "SIGN-IN CONFIGURED" : "SIGN-IN SETUP REQUIRED",
    canOfferSignIn,
    providerLabel,
    // Provider health or a test user in public GitHub cannot prove device wallet ownership.
    walletVerified: false
  };
}
