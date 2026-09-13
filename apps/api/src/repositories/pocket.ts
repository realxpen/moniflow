export type Pocket = {
  id: string;
  localUserId: string;
  name: string;
  targetAmount: number | null;
  allocatedAmount: number;
  currency: "NGN";
  createdAt: string;
  updatedAt: string;
};

export type PlanPocketAllocation = {
  localUserId: string;
  planId: string;
  actionIndex: number;
  name: string;
  amount: number;
};

export interface PocketRepository {
  list(localUserId: string): Promise<Pocket[]>;
  create(input: { localUserId: string; name: string; targetAmount?: number | null }): Promise<Pocket>;
  applyPlanAllocation(input: PlanPocketAllocation): Promise<{ pocket: Pocket; applied: boolean }>;
  totalAllocated(localUserId: string): Promise<number>;
  close(): Promise<void>;
}
