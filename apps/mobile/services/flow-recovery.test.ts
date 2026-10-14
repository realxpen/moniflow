import { describe, expect, it } from "vitest";
import { recoveryDecision, workspaceIdentity, type RecoveryInput } from "./flow-recovery";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const planId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const fixture: RecoveryInput = {
  hydrated: true, savedLocalUserId: alice, selectedLocalUserId: alice,
  authUserId: alice, development: false, provider: "bmoni", stage: "execution", planId
};

describe("operator flow recovery", () => {
  it("selects only the authenticated account in production and never follows another URL identity", () => {
    expect(workspaceIdentity({ routedId: alice, savedId: alice, authUserId: alice, development: false })).toBe(alice);
    expect(workspaceIdentity({ routedId: bob, savedId: alice, authUserId: alice, development: false })).toBe("");
    expect(workspaceIdentity({ routedId: alice, savedId: bob, authUserId: alice, development: false })).toBe("");
    expect(workspaceIdentity({ routedId: "", savedId: "", authUserId: alice, development: false })).toBe("");
    expect(workspaceIdentity({ routedId: alice, savedId: alice, authUserId: null, development: false })).toBe("");
    expect(workspaceIdentity({ routedId: bob, savedId: alice, authUserId: null, development: true })).toBe(bob);
  });
  it("does not surface a different account's persisted flow", () => {
    expect(recoveryDecision({ ...fixture, authUserId: bob }).kind).toBe("blocked");
    expect(recoveryDecision({ ...fixture, selectedLocalUserId: bob }).kind).toBe("blocked");
    expect(recoveryDecision({ ...fixture, provider: null }).kind).toBe("blocked");
  });
  it("does not replay a pre-plan instruction after refresh or migration", () => {
    expect(recoveryDecision({ ...fixture, stage: "processing", planId: "" }).kind).toBe("restart");
    expect(recoveryDecision({ ...fixture, stage: "plan", planId: "" }).kind).toBe("restart");
    expect(recoveryDecision({ ...fixture, stage: "signing", planId: "not-a-uuid" }).kind).toBe("restart");
  });
  it("returns only validated plan checkpoints for deliberate user navigation", () => {
    expect(recoveryDecision(fixture)).toEqual({
      kind: "ready", route: "/operator/execution", planId, localUserId: alice
    });
    expect(recoveryDecision({ ...fixture, stage: "plan" })).toMatchObject({ kind: "ready", route: "/operator/guard" });
    expect(recoveryDecision({ ...fixture, stage: "signing" })).toMatchObject({ kind: "ready", route: "/operator/signing" });
    expect(recoveryDecision({ ...fixture, stage: "result" })).toMatchObject({ kind: "ready", route: "/operator/result" });
  });
  it("does not resume before persistence hydration or when the checkpoint is finished", () => {
    expect(recoveryDecision({ ...fixture, hydrated: false }).kind).toBe("none");
    expect(recoveryDecision({ ...fixture, stage: "home" }).kind).toBe("none");
    expect(recoveryDecision({ ...fixture, stage: null }).kind).toBe("none");
  });
});
