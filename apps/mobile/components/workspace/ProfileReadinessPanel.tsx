import { StyleSheet, Text, View } from "react-native";

import { SecondaryButton, StatusPill } from "@/components/ui";
import type { ReadinessJourney } from "@/services/account-readiness-journey";
import { profileEvidenceTone, profileSessionBadge } from "@/services/profile-readiness-display";
import { colors, radius, spacing, typography } from "@/theme";

type ProfileReadinessPanelProps = {
  email: string | null;
  checking: boolean;
  journey: ReadinessJourney;
  error: string | null;
  reconciliationError: string | null;
  onRefresh: () => void;
  onOpenSession: () => void;
  onSignOut: () => void;
};

/**
 * Read-only presentation of already-validated, owner-scoped readiness.
 * Receives no provider credentials, wallet keys, money amounts or transaction
 * controls. Account session evidence is never a claim of BMONI ownership.
 */
export function ProfileReadinessPanel({
  email,
  checking,
  journey,
  error,
  reconciliationError,
  onRefresh,
  onOpenSession,
  onSignOut
}: ProfileReadinessPanelProps) {
  const badge = profileSessionBadge(journey, checking);
  const manualReview = journey.steps.some(
    step => step.id === "identity" && step.status === "MANUAL REVIEW"
  );

  return (
    <View style={styles.container}>
      <View style={styles.identityCard}>
        <View style={styles.identityRow}>
          <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Text style={styles.avatarSymbol}>✦</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.eyebrow}>MONIFLOW ACCOUNT</Text>
            <Text style={styles.identityEmail}>{email || "Signed-in profile"}</Text>
            <Text style={styles.identityNote}>Not provider identity verification.</Text>
          </View>
        </View>
        <StatusPill label={badge.label} tone={badge.tone} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.eyebrow}>YOUR ACCOUNT READINESS</Text>
        <Text style={styles.summary}>
          Five separate checks. Only MONIFlow session access can be confirmed here.
        </Text>
        {journey.steps.map((step, index) => (
          <View key={step.id} style={styles.stageCard}>
            <View style={[
              styles.stageIndex,
              step.status === "VERIFIED SESSION" && styles.stageIndexSession
            ]}>
              <Text style={styles.stageNumber}>{String(index + 1).padStart(2, "0")}</Text>
            </View>
            <View style={styles.stageDetail}>
              <Text style={styles.stageTitle}>{step.title}</Text>
              <StatusPill label={step.status} tone={profileEvidenceTone(step.status)} />
              <Text style={styles.stageExplanation}>{step.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.nextCard, manualReview && styles.manualReviewCard]}>
        <Text style={[styles.eyebrow, manualReview && styles.manualReviewHeading]}>
          {manualReview ? "MANUAL IDENTITY REVIEW" : "WHAT HAPPENS NEXT"}
        </Text>
        <Text style={styles.nextTitle}>{journey.nextActionTitle}</Text>
        <Text style={styles.nextDescription}>{journey.nextActionDetail}</Text>
        {reconciliationError ? <Text style={styles.error}>{reconciliationError}</Text> : null}
      </View>

      <View style={styles.controls}>
        <Text style={styles.eyebrow}>SESSION CONTROLS</Text>
        <SecondaryButton disabled={checking} onPress={onRefresh}>
          {checking ? "Checking account status…" : "Refresh account status"}
        </SecondaryButton>
        <SecondaryButton onPress={onOpenSession}>Check MONIFlow API session</SecondaryButton>
        <SecondaryButton onPress={onSignOut}>Sign out</SecondaryButton>
      </View>

      <Text style={styles.disclosure}>
        READ-ONLY · NO AUTOMATIC LINKING · NO FINANCIAL OPERATIONS · NO WALLET KEYS
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl
  },
  identityCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.card,
    gap: spacing.lg,
    padding: spacing.xl
  },
  identityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  avatarSymbol: {
    ...typography.heading,
    color: colors.statusProcessing
  },
  identityText: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0
  },
  eyebrow: {
    ...typography.technical,
    color: colors.statusProcessing
  },
  identityEmail: {
    ...typography.section,
    color: colors.textPrimary,
    flexShrink: 1
  },
  identityNote: {
    ...typography.caption,
    color: colors.textSecondary
  },
  section: {
    gap: spacing.sm
  },
  summary: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs
  },
  stageCard: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  stageIndex: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  stageIndexSession: {
    backgroundColor: colors.statusSuccessSoft
  },
  stageNumber: {
    ...typography.technical,
    color: colors.statusProcessing
  },
  stageDetail: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0
  },
  stageTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600"
  },
  stageExplanation: {
    ...typography.caption,
    color: colors.textSecondary
  },
  nextCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.card,
    gap: spacing.md,
    padding: spacing.xl
  },
  manualReviewCard: {
    backgroundColor: colors.statusWarningSoft
  },
  manualReviewHeading: {
    color: colors.statusWarning
  },
  nextTitle: {
    ...typography.heading,
    color: colors.textPrimary
  },
  nextDescription: {
    ...typography.body,
    color: colors.textSecondary
  },
  controls: {
    gap: spacing.md
  },
  error: {
    ...typography.caption,
    color: colors.statusError
  },
  disclosure: {
    ...typography.technical,
    color: colors.textSecondary,
    textAlign: "center"
  }
});
