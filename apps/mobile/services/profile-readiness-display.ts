import type { JourneyStatus, ReadinessJourney } from "./account-readiness-journey";

/**
 * Presentation policy only. The existing buildReadinessJourney function owns
 * account and evidence validation. Labels here never create new verified states.
 */
export function profileSessionBadge(
  journey: ReadinessJourney,
  checking: boolean
): { label: string; tone: "processing" | "warning" } {
  if (checking) return { label: "CHECKING MONIFLOW SESSION", tone: "processing" };
  if (journey.steps.find(step => step.id === "session")?.status === "VERIFIED SESSION") {
    return { label: "MONIFLOW SESSION CHECKED", tone: "processing" };
  }
  return { label: "SESSION NOT VERIFIED", tone: "warning" };
}

export function profileEvidenceTone(status: JourneyStatus): "processing" | "warning" | "neutral" {
  if (status === "VERIFIED SESSION") return "processing";
  if (status === "NOT CHECKED") return "neutral";
  return "warning";
}
