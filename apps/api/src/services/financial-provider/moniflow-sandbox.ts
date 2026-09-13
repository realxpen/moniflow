import { createHash } from "node:crypto";

import { BmoniProviderError } from "../bmoni/errors.js";
import type { BmoniGateway } from "../bmoni/gateway.js";
import type {
  BmoniUser,
  BvnLookup,
  CreateBmoniUserInput,
  CreateManagedWalletInput,
  KycProfileResponse,
  ManagedSmartWallet,
  OnboardingStatus,
  OwnerProofChallenge,
  OwnerProofChallengeInput,
  StartNigeriaOnboardingInput,
  StartNigeriaOnboardingResponse,
  SupportedSmartWalletCurrencies,
  UpdateNigeriaKycInput
} from "../bmoni/schemas.js";
import type { FinancialProviderGateway } from "./provider.js";
import { MONIFLOW_SANDBOX_PROVIDER } from "./provider.js";

type ProposalState = {
  id: string;
  bmoniUserId: string;
  smartWalletId: string;
  bankAccountId: string;
  amount: number;
  status: "PENDING_SIGNATURES" | "COMPLETED" | "FAILED";
};

const STARTING_CNGN_BALANCE = 300_000;

function token(seed: string, length = 24) {
  return createHash("sha256").update(seed).digest("hex").slice(0, length);
}

function address(seed: string) {
  return `0x${createHash("sha256").update(seed).digest("hex").slice(0, 40)}`;
}

function hash32(seed: string) {
  return `0x${createHash("sha256").update(seed).digest("hex")}`;
}

function provider404(message: string) {
  return new BmoniProviderError(
    404,
    { statusCode: 404, message, error: "Not Found" },
    null
  );
}

export class MoniflowSandboxProvider implements BmoniGateway, FinancialProviderGateway {
  readonly provider = MONIFLOW_SANDBOX_PROVIDER;

  private readonly balances = new Map<string, number>();
  private readonly nigeriaActive = new Set<string>();
  private readonly proposals = new Map<string, ProposalState>();

  private ensureBalance(bmoniUserId: string) {
    const existing = this.balances.get(bmoniUserId);
    if (existing !== undefined) return existing;
    this.balances.set(bmoniUserId, STARTING_CNGN_BALANCE);
    return STARTING_CNGN_BALANCE;
  }

  async createUser(input: CreateBmoniUserInput): Promise<BmoniUser> {
    const identitySeed = input.identityId ?? input.employeeId ?? input.email.toLowerCase();
    const bmoniUserId = `mf_sb_user_${token(identitySeed)}`;
    this.ensureBalance(bmoniUserId);

    return {
      bmoniUserId,
      employeeId: input.employeeId,
      identityId: input.identityId,
      firstName: input.firstName,
      lastName: input.lastName,
      middleName: input.middleName,
      email: input.email,
      phoneNumber: input.phoneNumber,
      employerName: input.employerName,
      occupation: input.occupation,
      monthlySalary: input.monthlySalary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async getSupportedSmartWalletCurrencies(): Promise<SupportedSmartWalletCurrencies> {
    return { currencies: ["CNGN"] };
  }

  async createOwnerProofChallenge(
    bmoniUserId: string,
    input: OwnerProofChallengeInput
  ): Promise<OwnerProofChallenge> {
    const challengeId = `mf_sb_ch_${token(`${bmoniUserId}:${input.userOwnerAddress.toLowerCase()}`)}`;
    return {
      challengeId,
      message: [
        "MONIFlow Sandbox owner proof",
        `user:${bmoniUserId}`,
        `currency:${input.currency}`,
        `owner:${input.userOwnerAddress.toLowerCase()}`,
        `challenge:${challengeId}`
      ].join("\n")
    };
  }

  async createManagedSmartWallet(
    bmoniUserId: string,
    input: CreateManagedWalletInput
  ): Promise<ManagedSmartWallet> {
    const expectedChallengeId =
      `mf_sb_ch_${token(`${bmoniUserId}:${input.userOwnerAddress.toLowerCase()}`)}`;
    if (input.ownerProofChallengeId !== expectedChallengeId) {
      throw new BmoniProviderError(
        409,
        { statusCode: 409, message: "Owner-proof challenge does not match the sandbox identity.", error: "Conflict" },
        null
      );
    }

    this.ensureBalance(bmoniUserId);
    const smartWalletId = `mf_sb_wallet_${token(bmoniUserId)}`;
    return {
      smartWalletId,
      address: address(`${bmoniUserId}:${smartWalletId}`),
      currency: "CNGN",
      status: "active",
      createdAt: new Date().toISOString()
    };
  }

  async lookupBvn(_bmoniUserId: string, bvn: string): Promise<BvnLookup> {
    return {
      bvn,
      firstName: "MONIFlow",
      lastName: "Sandbox",
      middleName: null,
      dateOfBirth: "1995-01-01",
      gender: "unspecified",
      email: null,
      phoneNumber: null
    };
  }

  async getKycOptions(_bmoniUserId: string): Promise<unknown> {
    return {
      employmentStatuses: ["employed", "self_employed", "student"],
      sourcesOfFunds: ["salary", "business_income", "savings"],
      accountPurposes: ["personal", "business", "savings"],
      simulated: true
    };
  }

  async getKycOccupations(_bmoniUserId: string, search: string): Promise<unknown> {
    const occupations = [
      { code: "software_engineer", name: "Software Engineer" },
      { code: "business_owner", name: "Business Owner" },
      { code: "student", name: "Student" }
    ];
    const needle = search.trim().toLowerCase();
    return needle
      ? occupations.filter((item) => item.name.toLowerCase().includes(needle))
      : occupations;
  }

  async updateNigeriaKyc(
    _bmoniUserId: string,
    _input: UpdateNigeriaKycInput
  ): Promise<KycProfileResponse> {
    return { status: "documents_required", simulated: true };
  }

  async getKycReadiness(_bmoniUserId: string): Promise<unknown> {
    return { status: "ready", simulated: true };
  }

  async activateKyc(_bmoniUserId: string): Promise<unknown> {
    return { status: "active", simulated: true };
  }

  async uploadKycIdentification(): Promise<unknown> {
    return { status: "uploaded", simulated: true };
  }

  async uploadKycProofOfAddress(): Promise<unknown> {
    return { status: "uploaded", simulated: true };
  }

  async startNigeriaOnboarding(
    bmoniUserId: string,
    _input: StartNigeriaOnboardingInput
  ): Promise<StartNigeriaOnboardingResponse> {
    this.nigeriaActive.add(bmoniUserId);
    return {
      country: "NGA",
      rail: "NGN",
      status: "ACTIVE",
      simulated: true
    };
  }

  async getOnboardingStatus(bmoniUserId: string): Promise<OnboardingStatus> {
    return {
      country: "NGA",
      rail: "NGN",
      status: this.nigeriaActive.has(bmoniUserId) ? "ACTIVE" : "PROCESSING",
      simulated: true
    };
  }

  async listAccountWallets(bmoniUserId: string): Promise<unknown> {
    const smartWalletId = `mf_sb_wallet_${token(bmoniUserId)}`;
    return {
      wallets: [{
        smartWalletId,
        address: address(`${bmoniUserId}:${smartWalletId}`),
        currency: "CNGN",
        status: "active",
        simulated: true
      }]
    };
  }

  async listAccountBalances(bmoniUserId: string): Promise<unknown> {
    return {
      balances: [{
        currency: "CNGN",
        availableBalance: this.ensureBalance(bmoniUserId).toFixed(2),
        fiatCurrency: "NGN",
        simulated: true
      }]
    };
  }

  async getSmartWallet(bmoniUserId: string, smartWalletId: string): Promise<unknown> {
    return {
      smartWalletId,
      address: address(`${bmoniUserId}:${smartWalletId}`),
      currency: "CNGN",
      status: "active",
      simulated: true
    };
  }

  async createNgnVirtualAccount(bmoniUserId: string, _smartWalletId: string): Promise<unknown> {
    if (!this.nigeriaActive.has(bmoniUserId)) {
      throw provider404("Activate the MONIFlow sandbox Nigeria rail before creating a deposit account.");
    }
    return this.depositAccount(bmoniUserId);
  }

  async getNgnDepositAccount(bmoniUserId: string): Promise<unknown> {
    if (!this.nigeriaActive.has(bmoniUserId)) {
      throw provider404("No MONIFlow sandbox NGN deposit account exists yet.");
    }
    return this.depositAccount(bmoniUserId);
  }

  private depositAccount(bmoniUserId: string) {
    const digits = createHash("sha256")
      .update(bmoniUserId)
      .digest("hex")
      .replace(/[a-f]/g, "7")
      .slice(0, 10);
    return {
      accountNumber: digits,
      accountName: "MONIFLOW SANDBOX",
      bankName: "MONIFlow Test Bank",
      currency: "NGN",
      status: "active",
      simulated: true
    };
  }

  async getNigerianBanks(_bmoniUserId: string): Promise<unknown> {
    return {
      banks: [
        { name: "Guaranty Trust Bank", code: "058" },
        { name: "Access Bank", code: "044" },
        { name: "Zenith Bank", code: "057" }
      ],
      simulated: true
    };
  }

  async verifyNigerianAccount(
    _bmoniUserId: string,
    input: { bankCode: string; accountNumber: string }
  ): Promise<unknown> {
    return {
      bankCode: input.bankCode,
      accountNumber: input.accountNumber,
      accountName: "MONIFLOW SANDBOX USER",
      simulated: true
    };
  }

  async registerNigerianWithdrawalAccount(
    bmoniUserId: string,
    input: {
      accountNumber: string;
      bankCode: string;
      bankName: string;
      accountHolderName: string;
    }
  ): Promise<unknown> {
    return {
      id: `mf_sb_bank_${token(`${bmoniUserId}:${input.bankCode}:${input.accountNumber}`)}`,
      ...input,
      verified: true,
      simulated: true
    };
  }

  async offrampNigeria(
    bmoniUserId: string,
    smartWalletId: string,
    input: { bankAccountId: string; fromAmount: string }
  ): Promise<unknown> {
    const amount = Number(input.fromAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BmoniProviderError(
        400,
        { statusCode: 400, message: "Sandbox offramp amount must be positive.", error: "Bad Request" },
        null
      );
    }
    if (amount > this.ensureBalance(bmoniUserId)) {
      throw new BmoniProviderError(
        409,
        { statusCode: 409, message: "Sandbox balance is insufficient.", error: "Conflict" },
        null
      );
    }

    const id =
      `mf_sb_prop_${token(`${bmoniUserId}:${smartWalletId}:${input.bankAccountId}:${input.fromAmount}`)}`;
    const proposal: ProposalState = {
      id,
      bmoniUserId,
      smartWalletId,
      bankAccountId: input.bankAccountId,
      amount,
      status: "PENDING_SIGNATURES"
    };
    this.proposals.set(id, proposal);
    return {
      proposalId: id,
      status: proposal.status,
      fromAmount: amount.toFixed(2),
      simulated: true
    };
  }

  async approveProposal(_bmoniUserId: string, proposalId: string): Promise<unknown> {
    const proposal = this.proposals.get(proposalId);
    if (proposal) proposal.status = "PENDING_SIGNATURES";
    return { proposalId, status: "PENDING_SIGNATURES", simulated: true };
  }

  async getProposalSignPayload(_bmoniUserId: string, proposalId: string): Promise<unknown> {
    return {
      proposalId,
      hashToSign: hash32(`moniflow-sandbox:${proposalId}`),
      simulated: true
    };
  }

  async signProposal(
    bmoniUserId: string,
    proposalId: string,
    _signature: string
  ): Promise<unknown> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw provider404("MONIFlow sandbox proposal was not found.");
    }

    if (proposal.status !== "COMPLETED") {
      const next = Math.max(0, this.ensureBalance(bmoniUserId) - proposal.amount);
      this.balances.set(bmoniUserId, next);
      proposal.status = "COMPLETED";
    }

    return { proposalId, status: "COMPLETED", simulated: true };
  }

  async getProposal(_bmoniUserId: string, proposalId: string): Promise<unknown> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw provider404("MONIFlow sandbox proposal was not found.");
    }
    return {
      proposalId: proposal.id,
      status: proposal.status,
      amount: proposal.amount.toFixed(2),
      simulated: true
    };
  }
}
