export const mockHomeData = {
  firstName: "Ayomide",
  availableBalance: 300_000,
  command: "Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.",
  suggestions: ["Save ₦20k", "Withdraw ₦40k", "Organize my income"],
  pockets: [
    { name: "Laptop", allocatedAmount: 20_000, targetAmount: 250_000 },
    { name: "Tax", allocatedAmount: 60_000, targetAmount: 120_000 }
  ],
  activity: [
    {
      amount: "₦20,000",
      label: "Laptop pocket preview",
      meta: "Internal allocation · mock data",
      source: "internal" as const
    },
    {
      amount: "₦60,000",
      label: "Tax pocket preview",
      meta: "Internal allocation · mock data",
      source: "internal" as const
    }
  ]
} as const;

export const mockPlan = {
  balanceBefore: 300_000,
  bankWithdrawal: 40_000,
  pocketAllocation: 20_000,
  expectedAvailableAfter: 240_000,
  destination: "GTBank · •••• 0194",
  pocket: "Laptop"
} as const;

export const mockDisclosure = "STATIC PREVIEW · NO BMONI DATA";
