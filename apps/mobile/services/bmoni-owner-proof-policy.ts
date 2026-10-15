/** Native wallet-owner proof checks. Never handles a private key or signing PIN. */
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const EIP191_SIGNATURE = /^0x[a-fA-F0-9]{130}$/;
const MAX_CHALLENGE_AGE_MS = 9 * 60 * 1000; // Provider challenges expire after ten minutes.

export function assertDeviceOwnerAddress(address: unknown): asserts address is string {
  if (typeof address !== "string" || !ADDRESS.test(address)) {
    throw new Error("The BMONI device wallet did not provide a valid owner address.");
  }
}

export function assertOwnerProofChallenge(value: unknown): asserts value is { challengeId: string; message: string } {
  if (!value || typeof value !== "object") throw new Error("BMONI did not return an owner-proof challenge.");
  const data = value as { challengeId?: unknown; message?: unknown };
  if (typeof data.challengeId !== "string" || !data.challengeId.trim() ||
      data.challengeId.length > 256 ||
      typeof data.message !== "string" || !data.message.trim() || data.message.length > 4096) {
    throw new Error("BMONI returned an invalid owner-proof challenge.");
  }
}

export function assertOwnerProofSignature(signature: unknown, challengeReceivedAtMs: number, nowMs: number) {
  if (typeof signature !== "string" || !EIP191_SIGNATURE.test(signature)) {
    throw new Error("The device did not return a valid 65-byte owner-proof signature.");
  }
  if (!Number.isFinite(challengeReceivedAtMs) || !Number.isFinite(nowMs) ||
      nowMs < challengeReceivedAtMs || nowMs - challengeReceivedAtMs >= MAX_CHALLENGE_AGE_MS) {
    throw new Error("The BMONI owner-proof challenge may have expired. Check wallet status before requesting a new challenge.");
  }
}
