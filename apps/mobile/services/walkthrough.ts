/**
 * Education-only walkthrough. No provider SDK, API calls, wallet, user ID,
 * approval token, signature, or financial mutation exists in this module.
 */
export const walkthroughCommand = "Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.";
export const walkthroughScenario = Object.freeze({
  openingBalance: 300000,
  withdrawal: 40000,
  laptopAllocation: 20000,
  providerAfter: 260000,
  availableAfter: 240000,
  currency: "NGN",
  simulated: true as const
});
export const walkthroughStages = [
  { id: "intent", eyebrow: "01 · INTENT", title: "Say what you want your money to do.", detail: "MONIFlow reads the instruction and identifies two actions. This is a guided example, not a submitted request." },
  { id: "plan", eyebrow: "02 · MONEY PLAN", title: "Review the two steps.", detail: "An external GTBank withdrawal and an internal Laptop allocation are different kinds of movement." },
  { id: "guard", eyebrow: "03 · MONI GUARD", title: "Safety checks happen before action.", detail: "A real plan requires verified account details, sufficient spendable funds, and explicit human approval." },
  { id: "approval", eyebrow: "04 · HUMAN CONTROL", title: "Nothing proceeds without your decision.", detail: "The real application asks for consent before any external money movement. This walkthrough cannot grant consent." },
  { id: "execution", eyebrow: "05 · ILLUSTRATION", title: "See what a confirmed result would show.", detail: "The figures below are illustrative. No BMONI request, signature, transfer, or wallet update occurred." },
  { id: "outcome", eyebrow: "06 · FINANCIAL MEMORY", title: "See how the numbers would reconcile.", detail: "A real result only shows completed provider movement after verification; pocket allocations are internal bookkeeping." }
] as const;

export function walkthroughNumbers() {
  const providerAfter = walkthroughScenario.openingBalance - walkthroughScenario.withdrawal;
  const availableAfter = providerAfter - walkthroughScenario.laptopAllocation;
  return { providerAfter, availableAfter, totalCommitted: walkthroughScenario.withdrawal + walkthroughScenario.laptopAllocation };
}
