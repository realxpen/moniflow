export type FinancialActivity = {
  id: string;
  localUserId: string;
  kind: string;
  status: string;
  amount: number | null;
  currency: string | null;
  reference: string;
  source: "provider" | "internal";
  metadata: Record<string, unknown>;
  createdAt: string;
};

export interface ActivityRepository {
  list(localUserId: string, limit?: number): Promise<FinancialActivity[]>;
  recordOnce(input: Omit<FinancialActivity, "id" | "createdAt">): Promise<{ activity: FinancialActivity; created: boolean }>;
  close(): Promise<void>;
}
