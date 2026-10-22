import { create } from "zustand";
import { interpretOfflineExample } from "../services/offline-intent-lab";

import {
  applyPracticeAction, initialPracticeLedger, practiceSummary,
  type PracticeAction, type PracticeLedger, type PracticeOutcome
} from "../services/offline-pocket-ledger";

/**
 * A user-opted-in, Figma-styled *example workspace* shared between tabs.
 * Values exist in volatile Zustand memory only, never in auth or the financial API.
 * Every read must be scoped to the signed-in user; no prior account state is reused.
 */
type ProductPreviewStore = {
  ownerId: string | null;
  active: boolean;
  serverMode: boolean;
  ledger: PracticeLedger;
  lastResult: PracticeOutcome["status"] | null;
  lastMessage: string | null;
  start: (ownerId: string) => void;
  enableServer: (ownerId: string) => void;
  disableServer: (ownerId: string) => void;
  end: () => void;
  simulate: (ownerId: string, action: PracticeAction) => PracticeOutcome["status"];
  simulateInstruction: (ownerId: string, instruction: string) => PracticeOutcome["status"];
};

const empty = () => ({
  ownerId: null, active: false, serverMode: false, ledger: initialPracticeLedger(),
  lastResult: null, lastMessage: null
});

export const useProductPreview = create<ProductPreviewStore>((set, get) => ({
  ...empty(),
  start: (ownerId) => {
    // Starting anew always clears any prior person's fictional records.
    if (!ownerId) return;
    set({ ...empty(), ownerId, active: true });
  },
  enableServer: (ownerId) => {
    const state = get();
    if (ownerId && state.active && state.ownerId === ownerId) set({ serverMode: true });
  },
  disableServer: (ownerId) => {
    const state = get();
    if (ownerId && state.active && state.ownerId === ownerId) set({ serverMode: false });
  },
  end: () => set(empty()),
  simulate: (ownerId, action) => {
    const state = get();
    if (!ownerId || !state.active || state.ownerId !== ownerId) return "BLOCKED";
    const result = applyPracticeAction(state.ledger, action);
    set({ ledger: result.ledger, lastResult: result.status, lastMessage: result.explanation });
    return result.status;
  },
  simulateInstruction: (ownerId, instruction) => {
    const state = get();
    if (!ownerId || !state.active || state.ownerId !== ownerId) return "BLOCKED";
    const parsed = interpretOfflineExample(instruction);
    if (parsed.state !== "RECOGNIZED") {
      set({ lastResult: "BLOCKED", lastMessage: parsed.explanation });
      return "BLOCKED";
    }
    const withdrawal = parsed.actions.find(action => action.kind === "BANK_WITHDRAWAL")?.amount ?? 0;
    const allocation = parsed.actions.find(action => action.kind === "ALLOCATE_POCKET")?.amount ?? 0;
    const available = practiceSummary(state.ledger).available;
    if (withdrawal + allocation > available) {
      set({ lastResult: "BLOCKED", lastMessage: "This example would overcommit your remaining demo funds. No action was applied." });
      return "BLOCKED";
    }
    // Stage every local change first; commit both or neither.
    let next = state.ledger;
    if (withdrawal > 0) {
      const r = applyPracticeAction(next, { type: "WITHDRAW", amountText: String(withdrawal) });
      if (r.status !== "SIMULATED") return "BLOCKED";
      next = r.ledger;
    }
    if (allocation > 0) {
      const r = applyPracticeAction(next, { type: "ALLOCATE", pocket: "Laptop", amountText: String(allocation) });
      if (r.status !== "SIMULATED") return "BLOCKED";
      next = r.ledger;
    }
    set({
      ledger: next, lastResult: "SIMULATED",
      lastMessage: "Both actions were simulated together. No MONI Guard authorization, bank verification or BMONI transaction occurred."
    });
    return "SIMULATED";
  }
}));

export function visiblePreview(ownerId: string | null, snapshot: Pick<ProductPreviewStore, "ownerId" | "active" | "ledger">) {
  if (!ownerId || !snapshot.active || snapshot.ownerId !== ownerId) return null;
  return { ledger: snapshot.ledger, summary: practiceSummary(snapshot.ledger) };
}
