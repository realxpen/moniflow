import { create } from "zustand";

import {
  applyPracticeAction, initialPracticeLedger, practiceSummary,
  type PracticeAction, type PracticeLedger, type PracticeOutcome
} from "@/services/offline-pocket-ledger";

/**
 * A user-opted-in, Figma-styled *example workspace* shared between tabs.
 * Values exist in volatile Zustand memory only, never in auth or the financial API.
 * Every read must be scoped to the signed-in user; no prior account state is reused.
 */
type ProductPreviewStore = {
  ownerId: string | null;
  active: boolean;
  ledger: PracticeLedger;
  lastResult: PracticeOutcome["status"] | null;
  lastMessage: string | null;
  start: (ownerId: string) => void;
  end: () => void;
  simulate: (ownerId: string, action: PracticeAction) => PracticeOutcome["status"];
};

const empty = () => ({
  ownerId: null, active: false, ledger: initialPracticeLedger(),
  lastResult: null, lastMessage: null
});

export const useProductPreview = create<ProductPreviewStore>((set, get) => ({
  ...empty(),
  start: (ownerId) => {
    // Starting anew always clears any prior person's fictional records.
    if (!ownerId) return;
    set({ ...empty(), ownerId, active: true });
  },
  end: () => set(empty()),
  simulate: (ownerId, action) => {
    const state = get();
    if (!ownerId || !state.active || state.ownerId !== ownerId) return "BLOCKED";
    const result = applyPracticeAction(state.ledger, action);
    set({ ledger: result.ledger, lastResult: result.status, lastMessage: result.explanation });
    return result.status;
  }
}));

export function visiblePreview(ownerId: string | null, snapshot: Pick<ProductPreviewStore, "ownerId" | "active" | "ledger">) {
  if (!ownerId || !snapshot.active || snapshot.ownerId !== ownerId) return null;
  return { ledger: snapshot.ledger, summary: practiceSummary(snapshot.ledger) };
}
