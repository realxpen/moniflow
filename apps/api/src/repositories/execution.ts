export type ExecutionState = "PREPARING" | "AWAITING_DEVICE_SIGNATURE" | "PROCESSING" | "COMPLETED" | "FAILED";

export type ProviderExecution = {
  planId: string;
  localUserId: string;
  providerProposalId: string;
  providerBankAccountId: string;
  amount: number;
  currency: "NGN";
  signHash: string | null;
  providerStatus: string | null;
  state: ExecutionState;
  createdAt: string;
  updatedAt: string;
};

export interface ExecutionRepository {
  findByPlanId(planId: string, localUserId: string): Promise<ProviderExecution | null>;
  create(value: ProviderExecution): Promise<ProviderExecution>;
  update(value: ProviderExecution): Promise<ProviderExecution>;
  close(): Promise<void>;
}
