import { describe, expect, it } from "vitest";
import {
  assertDeviceOwnerAddress, assertOwnerProofChallenge, assertOwnerProofSignature
} from "./bmoni-owner-proof-policy";

describe("native BMONI device owner-proof preflight", () => {
  const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const signature = "0x" + "a".repeat(130);
  it("accepts a valid device owner address and rejects untrusted or malformed values", () => {
    expect(() => assertDeviceOwnerAddress(address)).not.toThrow();
    for (const candidate of ["", "0x123", address + "ff", "fake", null]) {
      expect(() => assertDeviceOwnerAddress(candidate)).toThrow();
    }
  });
  it("accepts only non-empty bounded BMONI challenge IDs and messages", () => {
    expect(() => assertOwnerProofChallenge({ challengeId: "ch-1", message: "Sign this message" })).not.toThrow();
    for (const candidate of [null, {}, { challengeId: "x", message: "" },
      { challengeId: "", message: "text" },
      { challengeId: "x", message: "y".repeat(4097) },
      { challengeId: "y".repeat(257), message: "text" }]) {
      expect(() => assertOwnerProofChallenge(candidate)).toThrow();
    }
  });
  it("requires a 65-byte EIP-191 signature and an unexpired owner-proof challenge", () => {
    expect(() => assertOwnerProofSignature(signature, 1000, 1000 + 8 * 60_000)).not.toThrow();
    for (const candidate of ["", "0x" + "a".repeat(64), "0x" + "G".repeat(130), null]) {
      expect(() => assertOwnerProofSignature(candidate, 1000, 1000)).toThrow();
    }
    expect(() => assertOwnerProofSignature(signature, 1000, 1000 + 9 * 60_000)).toThrow("expired");
    expect(() => assertOwnerProofSignature(signature, 1000, 500)).toThrow("expired");
  });
});
