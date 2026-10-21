/**
 * Education-only product journey. These labels are explanations of the
 * planned architecture, not evidence that a BMONI action has taken place.
 * Never mix these steps with live account, financial or identity status.
 */
export const learningSteps = [
  { id: "intent", number: "01", title: "Intent", description: "Start with a goal such as withdrawing money and setting some aside for a laptop." },
  { id: "plan", number: "02", title: "Money Plan", description: "Separate external movements from internal Money Space allocations and explain their hypothetical effect." },
  { id: "guard", number: "03", title: "MONI Guard", description: "Real plans must pass integrity, funds and verified-destination checks before authorization." },
  { id: "review", number: "04", title: "Human review", description: "A person must approve the precise consequence before any real external movement." },
  { id: "verification", number: "05", title: "Execution evidence", description: "Only a genuine provider response can verify a completed money movement. The practice screens provide no such evidence." },
  { id: "memory", number: "06", title: "Financial Memory", description: "Only provider-confirmed activity belongs in a real account history; the demo's entries are temporary illustrations." }
] as const;

export const learningSafety = Object.freeze({
  simulated: true as const,
  providerConnected: false as const,
  walletSigningEnabled: false as const,
  financialOperationsEnabled: false as const,
  persistsAccountData: false as const
});

/**
 * A signed-in user can return to their read-only Home. The Home tabs
 * themselves independently enforce authentication. No auth token or user ID
 * is ever put in navigation params.
 */
export function learningReturnRoute(signedIn: boolean): "/(tabs)/home" | "/onboarding/welcome" {
  return signedIn ? "/(tabs)/home" : "/onboarding/welcome";
}
