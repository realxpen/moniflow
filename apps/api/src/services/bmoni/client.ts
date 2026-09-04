import { z } from "zod";

import type { BmoniConfig } from "./config.js";
import { BmoniProviderError, BmoniResponseValidationError, BmoniTransportError } from "./errors.js";
import type { BmoniGateway, BmoniUploadFile } from "./gateway.js";
import {
  bmoniErrorEnvelopeSchema,
  bvnLookupSchema,
  createBmoniUserResponseSchema,
  kycProfileResponseSchema,
  managedSmartWalletResponseSchema,
  onboardingStatusSchema,
  ownerProofChallengeResponseSchema,
  startNigeriaOnboardingResponseSchema,
  supportedSmartWalletCurrenciesSchema,
  type BmoniUser,
  type BvnLookup,
  type CreateBmoniUserInput,
  type CreateManagedWalletInput,
  type KycProfileResponse,
  type ManagedSmartWallet,
  type OnboardingStatus,
  type OwnerProofChallenge,
  type OwnerProofChallengeInput,
  type StartNigeriaOnboardingInput,
  type StartNigeriaOnboardingResponse,
  type SupportedSmartWalletCurrencies,
  type UpdateNigeriaKycInput
} from "./schemas.js";

type FetchImplementation = typeof fetch;
type RequestOptions = { body?: unknown; method: "GET" | "POST" | "PATCH" };
const providerPayloadSchema = z.unknown();

export class BmoniClient implements BmoniGateway {
  constructor(private readonly config: BmoniConfig, private readonly fetchImplementation: FetchImplementation = fetch) {}

  async getSupportedSmartWalletCurrencies(): Promise<SupportedSmartWalletCurrencies> {
    return this.request("/v1/smart-wallets/supported-currencies", supportedSmartWalletCurrenciesSchema, { method: "GET" });
  }

  async createUser(input: CreateBmoniUserInput): Promise<BmoniUser> {
    const response = await this.request("/v1/users", createBmoniUserResponseSchema, { body: input, method: "POST" });
    return response.user;
  }

  async createOwnerProofChallenge(bmoniUserId: string, input: OwnerProofChallengeInput): Promise<OwnerProofChallenge> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/smart-wallets/owner-proof-challenges`, ownerProofChallengeResponseSchema, { body: input, method: "POST" });
  }

  async createManagedSmartWallet(bmoniUserId: string, input: CreateManagedWalletInput): Promise<ManagedSmartWallet> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/smart-wallets/create-managed`, managedSmartWalletResponseSchema, { body: input, method: "POST" });
  }

  async lookupBvn(bmoniUserId: string, bvn: string): Promise<BvnLookup> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/kyc/bvn-lookup/${encodeURIComponent(bvn)}`, bvnLookupSchema, { method: "GET" });
  }

  async updateNigeriaKyc(bmoniUserId: string, input: UpdateNigeriaKycInput): Promise<KycProfileResponse> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/kyc`, kycProfileResponseSchema, { body: input, method: "PATCH" });
  }

  async getKycReadiness(bmoniUserId: string): Promise<unknown> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/kyc/readiness`, providerPayloadSchema, { method: "GET" });
  }

  async activateKyc(bmoniUserId: string): Promise<unknown> {
    // NGN intentionally omits sumsubLevelName. BMONI's current RN reference sends an empty JSON object.
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/kyc/activate`, providerPayloadSchema, { method: "POST", body: {} });
  }

  async uploadKycIdentification(bmoniUserId: string, input: {
    files: BmoniUploadFile[];
    type: string;
    documentNumber: string;
    issuingCountry: string;
    expirationDate?: string;
    issueDate?: string;
  }): Promise<unknown> {
    const form = new FormData();
    for (const file of input.files) appendFile(form, file);
    form.append("type", input.type);
    form.append("documentNumber", input.documentNumber);
    form.append("issuingCountry", input.issuingCountry);
    if (input.expirationDate) form.append("expirationDate", input.expirationDate);
    if (input.issueDate) form.append("issueDate", input.issueDate);
    return this.requestForm(`/v1/users/${encodeURIComponent(bmoniUserId)}/kyc/documents/identification`, form);
  }

  async uploadKycProofOfAddress(bmoniUserId: string, input: { files: BmoniUploadFile[]; type: string }): Promise<unknown> {
    const form = new FormData();
    for (const file of input.files) appendFile(form, file);
    form.append("type", input.type);
    return this.requestForm(`/v1/users/${encodeURIComponent(bmoniUserId)}/kyc/documents/proof-of-address`, form);
  }

  async startNigeriaOnboarding(bmoniUserId: string, input: StartNigeriaOnboardingInput): Promise<StartNigeriaOnboardingResponse> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/onboarding/start-nigeria`, startNigeriaOnboardingResponseSchema, { body: input, method: "POST" });
  }

  async getOnboardingStatus(bmoniUserId: string): Promise<OnboardingStatus> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/onboarding/status`, onboardingStatusSchema, { method: "GET" });
  }

  async listAccountWallets(bmoniUserId: string): Promise<unknown> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/smart-wallets/account/wallets`, providerPayloadSchema, { method: "GET" });
  }

  async listAccountBalances(bmoniUserId: string): Promise<unknown> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/smart-wallets/account/balances`, providerPayloadSchema, { method: "GET" });
  }

  async getSmartWallet(bmoniUserId: string, smartWalletId: string): Promise<unknown> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/smart-wallets/${encodeURIComponent(smartWalletId)}`, providerPayloadSchema, { method: "GET" });
  }

  async createNgnVirtualAccount(bmoniUserId: string, smartWalletId: string): Promise<unknown> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/vba/ngn`, providerPayloadSchema, { method: "POST", body: { smartWalletId } });
  }

  async getNgnDepositAccount(bmoniUserId: string): Promise<unknown> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/bank-accounts/deposit-accounts/NGN`, providerPayloadSchema, { method: "GET" });
  }

  async getNigerianBanks(bmoniUserId: string): Promise<unknown> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/bank-accounts/nigerian-banks`, providerPayloadSchema, { method: "GET" });
  }

  async verifyNigerianAccount(bmoniUserId: string, input: { bankCode: string; accountNumber: string }): Promise<unknown> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/bank-accounts/verify-nigerian-account`, providerPayloadSchema, { method: "POST", body: input });
  }

  async registerNigerianWithdrawalAccount(bmoniUserId: string, input: { accountNumber: string; bankCode: string; bankName: string; accountHolderName: string }): Promise<unknown> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/bank-accounts/withdrawal-accounts/nigeria`, providerPayloadSchema, { method: "POST", body: input });
  }

  async offrampNigeria(bmoniUserId: string, smartWalletId: string, input: { bankAccountId: string; fromAmount: string }): Promise<unknown> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/smart-wallets/${encodeURIComponent(smartWalletId)}/offramp/nigeria`, providerPayloadSchema, { method: "POST", body: input });
  }

  async approveProposal(bmoniUserId: string, proposalId: string): Promise<unknown> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/smart-wallets/proposals/${encodeURIComponent(proposalId)}/approve`, providerPayloadSchema, { method: "POST" });
  }

  async getProposalSignPayload(bmoniUserId: string, proposalId: string): Promise<unknown> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/smart-wallets/proposals/${encodeURIComponent(proposalId)}/sign-payload`, providerPayloadSchema, { method: "GET" });
  }

  async signProposal(bmoniUserId: string, proposalId: string, signature: string): Promise<unknown> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/smart-wallets/proposals/${encodeURIComponent(proposalId)}/sign`, providerPayloadSchema, { method: "POST", body: { signature } });
  }

  async getProposal(bmoniUserId: string, proposalId: string): Promise<unknown> {
    return this.request(`/v1/users/${encodeURIComponent(bmoniUserId)}/smart-wallets/proposals/${encodeURIComponent(proposalId)}`, providerPayloadSchema, { method: "GET" });
  }

  private async request<TSchema extends z.ZodType>(path: `/v1/${string}`, responseSchema: TSchema, options: RequestOptions): Promise<z.infer<TSchema>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    try {
      const response = await this.fetchImplementation(new URL(path.slice(1), this.config.baseUrl), {
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        headers: { accept: "application/json", ...(options.body === undefined ? {} : { "content-type": "application/json" }), "x-api-key": this.config.apiKey },
        method: options.method,
        signal: controller.signal
      });
      return this.parseResponse(response, responseSchema);
    } catch (error) {
      return this.handleRequestError(error, controller);
    } finally { clearTimeout(timeout); }
  }

  private async requestForm(path: `/v1/${string}`, form: FormData): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    try {
      const response = await this.fetchImplementation(new URL(path.slice(1), this.config.baseUrl), {
        body: form,
        headers: { accept: "application/json", "x-api-key": this.config.apiKey },
        method: "POST",
        signal: controller.signal
      });
      return this.parseResponse(response, providerPayloadSchema);
    } catch (error) {
      return this.handleRequestError(error, controller);
    } finally { clearTimeout(timeout); }
  }

  private async parseResponse<TSchema extends z.ZodType>(response: Response, responseSchema: TSchema): Promise<z.infer<TSchema>> {
    const requestId = response.headers.get("x-request-id");
    const payload = await this.readJson(response, requestId);
    if (!response.ok) {
      const providerError = bmoniErrorEnvelopeSchema.safeParse(payload);
      throw new BmoniProviderError(response.status, providerError.success ? providerError.data : null, requestId);
    }
    const parsed = responseSchema.safeParse(payload);
    if (!parsed.success) throw new BmoniResponseValidationError(requestId, { cause: parsed.error });
    return parsed.data;
  }

  private handleRequestError(error: unknown, controller: AbortController): never {
    if (error instanceof BmoniProviderError || error instanceof BmoniResponseValidationError) throw error;
    const timedOut = controller.signal.aborted;
    throw new BmoniTransportError(timedOut ? "BMONI request timed out." : "BMONI could not be reached.", timedOut, { cause: error });
  }

  private async readJson(response: Response, requestId: string | null): Promise<unknown> {
    const rawBody = await response.text();
    if (!rawBody.trim()) return {};
    try { return JSON.parse(rawBody) as unknown; }
    catch (error) { throw new BmoniResponseValidationError(requestId, { cause: error }); }
  }
}

function appendFile(form: FormData, file: BmoniUploadFile) {
  const bytes = new Uint8Array(file.bytes);
  form.append("files", new Blob([bytes], { type: file.contentType }), file.filename);
}
