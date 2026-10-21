export type ProviderResultState = "PREPARING" | "AWAITING_DEVICE_SIGNATURE" | "PROCESSING" | "COMPLETED" | "FAILED";

export type ProviderResultPresentation = {
  title: string;
  stateLabel: string;
  tone: "processing" | "success" | "warning";
  description: string;
};

/** UI wording only. A request, proposal, approval or signature is not a confirmed transfer. */
export function providerResultPresentation(
  state: ProviderResultState | null | undefined
): ProviderResultPresentation {
  if (state === "COMPLETED") {
    return {
      title: "Movement complete.",
      stateLabel: "PROVIDER CONFIRMED",
      tone: "success",
      description: "Provider completion is confirmed. Internal MONIFlow allocations are recorded separately."
    };
  }
  if (state === "FAILED") {
    return {
      title: "Not completed.",
      stateLabel: "PROVIDER FAILED",
      tone: "warning",
      description: "The provider reports failure. No successful external money movement is claimed."
    };
  }
  if (state === "PROCESSING") {
    return {
      title: "Still processing.",
      stateLabel: "AWAITING PROVIDER STATUS",
      tone: "processing",
      description: "A request or signature is not proof that funds moved. A final provider status is still required."
    };
  }
  if (state === "AWAITING_DEVICE_SIGNATURE") {
    return {
      title: "Signature required.",
      stateLabel: "DEVICE SIGNING NEEDED",
      tone: "processing",
      description: "Approval is recorded, but a verified device signature is still needed. No movement is confirmed."
    };
  }
  return {
    title: "Status not confirmed.",
    stateLabel: "RESULT UNAVAILABLE",
    tone: "warning",
    description: "Without a trustworthy provider result MONIFlow cannot claim success or failure. Review status safely."
  };
}
