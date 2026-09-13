export function computeAvailableToSpend(providerBalance: number, internalAllocated: number) {
  if (!Number.isFinite(providerBalance) || providerBalance < 0) {
    throw new Error("providerBalance must be a finite non-negative number.");
  }
  if (!Number.isFinite(internalAllocated) || internalAllocated < 0) {
    throw new Error("internalAllocated must be a finite non-negative number.");
  }
  return Math.max(0, providerBalance - internalAllocated);
}
