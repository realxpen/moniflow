import { apiFetch } from "@/services/api-fetch";
import { resolveApiUrl } from "@/services/runtime";

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

export async function loadPockets(localUserId: string) {
  const response = await apiFetch(`${resolveApiUrl()}/api/pockets?localUserId=${encodeURIComponent(localUserId)}`);
  const payload = (await response.json()) as { pockets?: Pocket[]; summary?: { totalAllocated: number; currency: "NGN"; accounting: "internal" }; message?: string };
  if (!response.ok || !payload.pockets || !payload.summary) throw new Error(payload.message ?? "MONIFlow pockets could not be loaded.");
  return { pockets: payload.pockets, summary: payload.summary };
}

export async function createPocket(localUserId: string, name: string, targetAmount?: number) {
  const response = await apiFetch(`${resolveApiUrl()}/api/pockets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ localUserId, name, ...(targetAmount ? { targetAmount } : {}) })
  });
  const payload = (await response.json()) as { pocket?: Pocket; message?: string };
  if (!response.ok || !payload.pocket) throw new Error(payload.message ?? "MONIFlow pocket could not be created.");
  return payload.pocket;
}
