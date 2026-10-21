import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { interpretOfflineExample, offlineIntentExamples } from "./offline-intent-lab";
import { createOfflinePlanHandoff, readOfflinePlanHandoff } from "./offline-plan-handoff";
import { evaluatePlayground } from "./money-plan-playground";

describe("Phase 33G offline Intent-to-Plan educational handoff", () => {
  it("copies only fictional numeric amounts from a fully recognized multi-action example", () => {
    const result = interpretOfflineExample(offlineIntentExamples[0].command);
    expect(createOfflinePlanHandoff(result)).toEqual({
      source: "intent-lab", withdrawal: "40000", allocation: "20000"
    });
    const handoff = createOfflinePlanHandoff(result);
    expect(handoff && readOfflinePlanHandoff(handoff)).toEqual(handoff);
    const imported = handoff && readOfflinePlanHandoff(handoff);
    expect(imported && evaluatePlayground(imported.withdrawal, imported.allocation)).toMatchObject({
      status: "MATH_PREVIEW", providerAfter: 260000, availableAfter: 240000,
      financialOperationsEnabled: false, bankDestinationVerified: false
    });
  });

  it("preserves a single withdrawal or single allocation as a zero in the other field", () => {
    expect(createOfflinePlanHandoff(interpretOfflineExample("Withdraw ₦15,000 to GTBank.")))
      .toEqual({ source: "intent-lab", withdrawal: "15000", allocation: "0" });
    expect(createOfflinePlanHandoff(interpretOfflineExample("Save ₦100,000 for my laptop.")))
      .toEqual({ source: "intent-lab", withdrawal: "0", allocation: "100000" });
  });

  it("does not advance blocked, unsupported, live-data requests or absent parsing", () => {
    expect(createOfflinePlanHandoff(null)).toBeNull();
    for (const id of ["insufficient", "unknown", "balance"] as const) {
      const example = offlineIntentExamples.find(item => item.id === id)!;
      expect(createOfflinePlanHandoff(interpretOfflineExample(example.command))).toBeNull();
    }
    expect(createOfflinePlanHandoff(interpretOfflineExample("Withdraw ₦40,000 to GTBank and transfer all funds")))
      .toBeNull();
  });

  it("rejects tampered parser permission flags, bank ownership and stale math", () => {
    const valid = interpretOfflineExample(offlineIntentExamples[0].command);
    const copies = [
      { ...valid, simulationOnly: false },
      { ...valid, realExecutionAllowed: true },
      { ...valid, bankVerified: true },
      { ...valid, parsingMode: "SERVER_AUTHORIZED" },
      { ...valid, actions: [{ kind: "BANK_WITHDRAWAL", amount: 40000, bank: "GTBank", verified: true }] },
      { ...valid, actions: [{ kind: "BANK_WITHDRAWAL", amount: 40000, bank: "Other Bank", verified: false }] },
      { ...valid, actions: [...valid.actions, ...valid.actions] },
      { ...valid, actions: [] },
      { ...valid, preview: null },
      { ...valid, preview: { ...valid.preview, status: "BLOCKED" } },
      { ...valid, preview: { ...valid.preview, withdrawal: 1 } }
    ];
    for (const candidate of copies) {
      expect(createOfflinePlanHandoff(candidate as Parameters<typeof createOfflinePlanHandoff>[0]))
        .toBeNull();
    }
  });

  it("rejects untrusted URL input when missing origin marker or either amount", () => {
    const fields = { source: "intent-lab", withdrawal: "40000", allocation: "20000" };
    expect(readOfflinePlanHandoff({ withdrawal: "40000", allocation: "20000" })).toBeNull();
    expect(readOfflinePlanHandoff({ ...fields, source: "provider" })).toBeNull();
    expect(readOfflinePlanHandoff({ ...fields, allocation: undefined })).toBeNull();
    expect(readOfflinePlanHandoff({ ...fields, withdrawal: ["40000"] })).toBeNull();
    expect(readOfflinePlanHandoff({ ...fields, allocation: ["20000"] })).toBeNull();
    expect(readOfflinePlanHandoff({ ...fields, source: ["intent-lab"] })).toBeNull();
  });

  it("rejects forged/negative/oversized/overspending direct deep links", () => {
    for (const value of [
      "", "04", "-1", "+1", "1.00", "4,000", "1e4", "NaN", "99999999999",
      "40000;token=secret", "₦40000", "1000000001"
    ]) {
      expect(readOfflinePlanHandoff({
        source: "intent-lab", withdrawal: value, allocation: "20000"
      })).toBeNull();
    }
    for (const values of [
      { withdrawal: "0", allocation: "0" },
      { withdrawal: "250001", allocation: "50000" },
      { withdrawal: "1000000000", allocation: "1" }
    ]) {
      expect(readOfflinePlanHandoff({ source: "intent-lab", ...values })).toBeNull();
    }
  });

  it("does not permit approval or actual provider access for any accepted value handoff", () => {
    const value = readOfflinePlanHandoff({
      source: "intent-lab", withdrawal: "250000", allocation: "50000"
    });
    expect(value).toEqual({ source: "intent-lab", withdrawal: "250000", allocation: "50000" });
    const preview = evaluatePlayground(value!.withdrawal, value!.allocation);
    expect(preview).toMatchObject({
      status: "MATH_PREVIEW", availableAfter: 0,
      simulationOnly: true, financialOperationsEnabled: false, bankDestinationVerified: false
    });
  });

  it("connects both routes without passing raw instructions, identities or access tokens", () => {
    const logic = readFileSync("apps/mobile/services/offline-plan-handoff.ts", "utf8");
    const intent = readFileSync("apps/mobile/app/learn/intent.tsx", "utf8");
    const playground = readFileSync("apps/mobile/app/learn/playground.tsx", "utf8");
    expect(intent).toContain('pathname: "/learn/playground"');
    expect(intent).toContain("createOfflinePlanHandoff(evaluated)");
    expect(playground).toContain("readOfflinePlanHandoff(routeParams)");
    expect(playground).toContain("Restore amounts from Intent Lab");
    expect(logic + intent + playground).not.toMatch(/from ["'][^"']*(api-fetch|bmoni-device|banking|execution|money-plan\.ts|approval|wallet-dashboard|sandbox-api|AsyncStorage)[^"']*["']/);
    expect(logic + intent + playground).not.toMatch(/\b(?:fetch|apiFetch|signTransactionHash|initWallet|setPin|localStorage)\s*\(/);
    expect(logic).not.toContain("accessToken:");
  });
});
