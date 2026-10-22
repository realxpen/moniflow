import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";

import { initialPracticeLedger, practiceSummary } from "./offline-pocket-ledger";
import { useProductPreview, visiblePreview } from "../store/product-preview";

const ownerA = "e946686b-6139-485f-8294-1d575f697995";
const ownerB = "e077a5e8-a6f6-4709-8fab-7dd865b958ca6";

beforeEach(() => {
  useProductPreview.getState().end();
});

describe("Figma-aligned unified owner-scoped demo workspace", () => {
  it("keeps the same isolated Pocket and Activity state across signed-in tabs", () => {
    const store = useProductPreview.getState();
    store.start(ownerA);
    expect(useProductPreview.getState().simulate(ownerA, {
      type: "ALLOCATE", pocket: "Laptop", amountText: "20000"
    })).toBe("SIMULATED");
    expect(useProductPreview.getState().simulate(ownerA, {
      type: "WITHDRAW", amountText: "40000"
    })).toBe("SIMULATED");
    const snapshot = visiblePreview(ownerA, useProductPreview.getState());
    expect(snapshot?.summary).toMatchObject({
      providerBalance: 260000, allocated: 20000, available: 240000,
      provenance: "LOCAL_SIMULATION", realBalanceVerified: false,
      financialOperationsEnabled: false
    });
    expect(snapshot?.ledger.entries).toHaveLength(2);
    expect(useProductPreview.getState().lastMessage).toMatch(/No provider request/);
  });

  it("blocks old-owner reads and writes immediately after account change", () => {
    useProductPreview.getState().start(ownerA);
    useProductPreview.getState().simulate(ownerA, { type: "ALLOCATE", pocket: "Rent", amountText: "15000" });
    expect(visiblePreview(ownerB, useProductPreview.getState())).toBeNull();
    expect(useProductPreview.getState().simulate(ownerB, {
      type: "WITHDRAW", amountText: "100"
    })).toBe("BLOCKED");
    useProductPreview.getState().start(ownerB);
    expect(visiblePreview(ownerA, useProductPreview.getState())).toBeNull();
    expect(visiblePreview(ownerB, useProductPreview.getState())?.ledger).toEqual(initialPracticeLedger());
    expect(useProductPreview.getState().simulate(ownerA, {
      type: "ALLOCATE", pocket: "Laptop", amountText: "100"
    })).toBe("BLOCKED");
  });

  it("discards all state when demo is exited or signed-out", () => {
    useProductPreview.getState().start(ownerA);
    useProductPreview.getState().simulate(ownerA, { type: "WITHDRAW", amountText: "10000" });
    useProductPreview.getState().end();
    expect(visiblePreview(ownerA, useProductPreview.getState())).toBeNull();
    expect(useProductPreview.getState().ledger).toEqual(initialPracticeLedger());
    expect(useProductPreview.getState().lastMessage).toBeNull();
  });

  it("interprets a combined example atomically and rejects overcommit without partial writes", () => {
    useProductPreview.getState().start(ownerA);
    const s = useProductPreview.getState();
    expect(s.simulateInstruction(ownerA,
      "Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop."
    )).toBe("SIMULATED");
    expect(practiceSummary(useProductPreview.getState().ledger)).toMatchObject({
      providerBalance: 260000, allocated: 20000, available: 240000
    });
    const before = useProductPreview.getState().ledger;
    expect(useProductPreview.getState().simulateInstruction(ownerA,
      "Withdraw ₦250,000 to GTBank and save ₦100,000 for my laptop."
    )).toBe("BLOCKED");
    expect(useProductPreview.getState().ledger).toBe(before);
    expect(useProductPreview.getState().ledger.entries).toHaveLength(2);
  });

  it("does not accept open-ended, personal-data or unsupported banking instructions", () => {
    useProductPreview.getState().start(ownerA);
    for (const text of [
      "Transfer all my money to a stranger",
      "Show my recent activity",
      "Withdraw ₦50,000 to Access Bank",
      "Save ₦200,000 for my vacation",
      ""
    ]) {
      expect(useProductPreview.getState().simulateInstruction(ownerA, text)).toBe("BLOCKED");
      expect(useProductPreview.getState().ledger.entries).toHaveLength(0);
    }
  });

  it("retains a strict separation from real accounts and provider clients in source", () => {
    const store = readFileSync("apps/mobile/store/product-preview.ts", "utf8");
    const screen = readFileSync("apps/mobile/components/workspace/FigmaPreviewWorkspace.tsx", "utf8");
    const owner = readFileSync("apps/mobile/components/AuthenticatedWorkspace.tsx", "utf8");
    expect(store + screen).not.toMatch(/from ["'][^"']*(?:api-fetch|bmoni-device|wallet-dashboard|sandbox-api|execution|AsyncStorage|money-plan\.ts)["']/);
    expect(store + screen).not.toMatch(/\b(?:fetch|apiFetch|signTransactionHash|signMessage|initWallet|setPin|localStorage)\s*\(/);
    expect(owner).toContain("selectVisibleOwnerSnapshot(auth?.userId, snapshot)");
    expect(owner).toContain("previewOwner === auth.userId");
    expect(owner).toContain("if (previewOwner && previewOwner !== auth?.userId) endPreview()");
    expect(owner).toContain("endPreview();");
    expect(screen).toContain("SIMULATED DATA · NO REAL PAYMENTS");
    expect(screen).toContain("SIMULATED · NOT SETTLED");
  });
});
