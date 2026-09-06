import { describe, expect, it } from "vitest";

import {
  createBmoniUserResponseSchema,
  managedSmartWalletResponseSchema
} from "./schemas.js";

describe("BMONI current provider response compatibility", () => {
  it("accepts the current flat create-user response", () => {
    const parsed = createBmoniUserResponseSchema.parse({
      id: "provider-row-1",
      company: "sandbox-partner",
      bmoniUserId: "bmoni-user-1",
      firstName: "Chiamaka",
      lastName: "Okafor",
      email: "embedded.demo+1@example.com",
      phoneNumber: "+2348012345678"
    });

    expect(parsed.user.bmoniUserId).toBe("bmoni-user-1");
  });

  it("normalizes a managed wallet using walletId and walletAddress", () => {
    const wallet = managedSmartWalletResponseSchema.parse({
      walletId: "wallet-1",
      walletAddress: "0x1111111111111111111111111111111111111111",
      currency: "CNGN",
      isActive: true
    });

    expect(wallet.smartWalletId).toBe("wallet-1");
    expect(wallet.address).toBe("0x1111111111111111111111111111111111111111");
    expect(wallet.status).toBe("active");
  });

  it("rejects a managed wallet with no provider wallet identifier", () => {
    expect(() => managedSmartWalletResponseSchema.parse({
      walletAddress: "0x1111111111111111111111111111111111111111",
      currency: "CNGN"
    })).toThrow();
  });
});
