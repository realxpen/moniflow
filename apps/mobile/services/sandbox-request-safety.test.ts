import { describe, expect, it } from "vitest";
import {
  canApplySandboxFailure, canApplySandboxResponse, mutationRecoveryMessage
} from "./sandbox-request-safety";
import { SandboxApiError } from "./sandbox-api";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const valid = {
  requestedOwner: alice,
  responseOwner: alice,
  requestedAuthRevision: 7,
  activeScope: { userId: alice, revision: 7 },
  requestedSequence: 3,
  latestSequence: 3,
  currentScreenOwner: alice
};

describe("iPhone PWA account switch and response race fence", () => {
  it("accepts only the current verified owner, login generation and newest read", () => {
    expect(canApplySandboxResponse(valid)).toBe(true);
    expect(canApplySandboxResponse({ ...valid, requestedOwner: alice.toUpperCase() })).toBe(true);
    expect(canApplySandboxResponse({ ...valid, responseOwner: bob })).toBe(false);
    expect(canApplySandboxResponse({ ...valid, activeScope: { userId: bob, revision: 7 } })).toBe(false);
    expect(canApplySandboxResponse({ ...valid, activeScope: { userId: null, revision: 7 } })).toBe(false);
    expect(canApplySandboxResponse({ ...valid, activeScope: { userId: alice, revision: 8 } })).toBe(false);
    expect(canApplySandboxResponse({ ...valid, requestedSequence: 2 })).toBe(false);
    expect(canApplySandboxResponse({ ...valid, latestSequence: 4 })).toBe(false);
    expect(canApplySandboxResponse({ ...valid, currentScreenOwner: bob })).toBe(false);
  });

  it("prevents old-account async failures appearing after sign-out, switch or new login", () => {
    const { responseOwner: _, ...scope } = valid;
    expect(canApplySandboxFailure(scope)).toBe(true);
    expect(canApplySandboxFailure({ ...scope, activeScope: { userId: null, revision: 8 } })).toBe(false);
    expect(canApplySandboxFailure({ ...scope, activeScope: { userId: bob, revision: 8 } })).toBe(false);
    expect(canApplySandboxFailure({ ...scope, activeScope: { userId: alice, revision: 8 } })).toBe(false);
    expect(canApplySandboxFailure({ ...scope, latestSequence: 4 })).toBe(false);
  });
});

describe("unknown outcome recovery never replays sandbox mutations", () => {
  it("requires authoritative read-only reconciliation after network timeout", () => {
    const r = mutationRecoveryMessage(new Error("Failed to fetch"));
    expect(r.outcomeUnknown).toBe(true);
    expect(r.message).toContain("may already be saved");
    expect(r.message).toContain("Do not tap the action again");
    expect(r.message).toContain("read-only refresh");
    const timedOut = mutationRecoveryMessage(new Error("request timed out"));
    expect(timedOut.outcomeUnknown).toBe(true);
  });

  it("treats 5xx as unknown but confirmed guard/owner rejections as rejected", () => {
    expect(mutationRecoveryMessage(new SandboxApiError("INTERNAL", 503, "server down")).outcomeUnknown).toBe(true);
    for (const status of [400, 401, 403, 404, 409, 422]) {
      const r = mutationRecoveryMessage(new SandboxApiError("REJECTED", status, "rejected"));
      expect(r.outcomeUnknown).toBe(false);
      expect(r.message).toContain("read-only refresh");
    }
  });

  it("no approved-route replay or stale data display exists in the sandbox component", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("apps/mobile/components/workspace/ServerSandboxWorkspace.tsx", "utf8");
    expect(src).toContain("if (actionRef.current) return;");
    expect(src).toContain("canApplySandboxResponse");
    expect(src).toContain("canApplySandboxFailure");
    expect(src).toContain("currentAuthScope()");
    expect(src).toContain("SIMULATION OUTCOME UNKNOWN");
    expect(src).toContain("read-only server status");
    expect(src).toContain("setWorkspace(null)");
    expect(src).toContain("void refresh()");
    expect(src).not.toContain("setTimeout(() => act");
  });
});
