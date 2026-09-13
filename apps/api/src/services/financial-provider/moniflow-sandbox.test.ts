import { describe, expect, it } from "vitest";

import { MoniflowSandboxProvider } from "./moniflow-sandbox.js";

describe("MONIFlow sandbox financial provider", () => {
  it("supports deterministic identity, wallet, balance and signed offramp flow", async () => {
    const provider = new MoniflowSandboxProvider();

    expect(provider.provider).toMatchObject({
      id: "moniflow-sandbox",
      simulated: true
    });

    const user = await provider.createUser({
      firstName: "MONIFlow",
      lastName: "Sandbox",
      email: "sandbox@example.com",
      phoneNumber: "+2348000000099",
      identityId: "moniflow-test-user"
    });

    const ownerAddress = "0x1111111111111111111111111111111111111111";
    const challenge = await provider.createOwnerProofChallenge(user.bmoniUserId, {
      currency: "CNGN",
      userOwnerAddress: ownerAddress
    });

    const wallet = await provider.createManagedSmartWallet(user.bmoniUserId, {
      currency: "CNGN",
      userOwnerAddress: ownerAddress,
      ownerProofChallengeId: challenge.challengeId,
      ownerProofSignature: `0x${"22".repeat(65)}`
    });

    expect(wallet.currency).toBe("CNGN");
    expect(wallet.address).toMatch(/^0x[0-9a-f]{40}$/);

    const before = await provider.listAccountBalances(user.bmoniUserId);
    expect(JSON.stringify(before)).toContain("300000.00");

    const proposal = await provider.offrampNigeria(
      user.bmoniUserId,
      wallet.smartWalletId!,
      { bankAccountId: "mf_sb_bank_test", fromAmount: "40000.00" }
    ) as { proposalId: string; status: string };

    expect(proposal.status).toBe("PENDING_SIGNATURES");

    const signPayload = await provider.getProposalSignPayload(
      user.bmoniUserId,
      proposal.proposalId
    ) as { hashToSign: string };
    expect(signPayload.hashToSign).toMatch(/^0x[0-9a-f]{64}$/);

    await provider.signProposal(
      user.bmoniUserId,
      proposal.proposalId,
      `0x${"33".repeat(65)}`
    );

    const finalProposal = await provider.getProposal(
      user.bmoniUserId,
      proposal.proposalId
    ) as { status: string };
    expect(finalProposal.status).toBe("COMPLETED");

    const after = await provider.listAccountBalances(user.bmoniUserId);
    expect(JSON.stringify(after)).toContain("260000.00");
  });
});
