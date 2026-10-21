/**
 * Text-only, account-agnostic UX for financial information that cannot
 * safely be read yet. These are explanations, NOT observed financial data.
 */
export type ReadOnlyFinancialTab = "pockets" | "activity";

export type ReadOnlyFinancialContent = {
  summaryLabel: string;
  unavailableLabel: "Not available yet";
  unavailableExplanation: string;
  sectionLabel: string;
  explanations: ReadonlyArray<{ title: string; description: string }>;
  practiceLabel: string;
  practiceDisclosure: string;
  practiceRoute: "/learn/playground" | "/demo/walkthrough";
};

const views: Readonly<Record<ReadOnlyFinancialTab, ReadOnlyFinancialContent>> = {
  pockets: {
    summaryLabel: "TOTAL ALLOCATED",
    unavailableLabel: "Not available yet",
    unavailableExplanation: "No account-linked allocations have been read. This is not a zero balance or proof that you have no Pockets.",
    sectionLabel: "UNDERSTAND POCKETS",
    explanations: [
      {
        title: "Pockets are a plan for your money.",
        description: "They organise your available balance as internal MONIFlow allocations. They are not separate bank accounts or provider-held deposits."
      }
    ],
    practiceLabel: "Explore Pocket examples",
    practiceDisclosure: "OFFLINE PRACTICE · NO REAL FUNDS",
    practiceRoute: "/learn/playground"
  },
  activity: {
    summaryLabel: "ACCOUNT ACTIVITY",
    unavailableLabel: "Not available yet",
    unavailableExplanation: "No provider-backed history has been fetched. This does not mean there are zero transactions.",
    sectionLabel: "HOW RECORDS WILL APPEAR",
    explanations: [
      {
        title: "Provider-confirmed movement",
        description: "A completed transfer is shown only with evidence from the financial provider."
      },
      {
        title: "Pocket allocation",
        description: "Internal MONIFlow bookkeeping, never a separate provider-held payment."
      },
      {
        title: "Processing",
        description: "Awaiting final confirmation is never shown as completed."
      }
    ],
    practiceLabel: "Explore the safe walkthrough",
    practiceDisclosure: "OFFLINE PRACTICE · NO PROVIDER DATA",
    practiceRoute: "/demo/walkthrough"
  }
};

export function getReadOnlyFinancialContent(tab: ReadOnlyFinancialTab): ReadOnlyFinancialContent {
  return views[tab];
}
