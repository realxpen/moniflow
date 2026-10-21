import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  getReadOnlyFinancialContent,
  type ReadOnlyFinancialTab
} from "@/services/read-only-financial-content";
import { colors, radius, spacing, typography } from "@/theme";

type ReadOnlyFinancialPanelProps = {
  tab: ReadOnlyFinancialTab;
  checking: boolean;
  onOpenPractice: () => void;
};

/**
 * Presentation only; this component accepts no amounts, account IDs,
 * transactions, provider clients or money movement handlers.
 * Real Pockets and Activity remain withheld behind independently verified
 * account ownership, wallet/KYC readiness and provider access.
 */
export function ReadOnlyFinancialPanel({
  tab,
  checking,
  onOpenPractice
}: ReadOnlyFinancialPanelProps) {
  const copy = getReadOnlyFinancialContent(tab);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.micro}>{copy.summaryLabel}</Text>
        <Text style={styles.unavailable}>
          {checking ? "Checking account status…" : copy.unavailableLabel}
        </Text>
        <Text style={styles.explanation}>
          {checking
            ? "Only your signed-in MONIFlow session is being checked. No financial balances or history are being fetched."
            : copy.unavailableExplanation}
        </Text>
      </View>

      <View style={styles.educationSection}>
        <Text style={styles.micro}>{copy.sectionLabel}</Text>
        <View style={styles.explanationList}>
          {copy.explanations.map((row, index) => (
            <View key={row.title} style={styles.explanationCard}>
              {tab === "activity" ? (
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={[
                    styles.marker,
                    index === 0
                      ? styles.providerMarker
                      : index === 1
                        ? styles.bookkeepingMarker
                        : styles.processingMarker
                  ]}
                />
              ) : null}
              <View style={styles.explanationText}>
                <Text style={styles.explanationTitle}>{row.title}</Text>
                <Text style={styles.explanationDetail}>{row.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.practiceLabel}
        accessibilityHint="Opens an educational example. No real financial account is accessed."
        onPress={onOpenPractice}
        style={({ pressed }) => [styles.practiceAction, pressed && styles.pressed]}
      >
        <Text style={styles.practiceText}>{copy.practiceLabel}</Text>
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.practiceArrow}
        >
          →
        </Text>
      </Pressable>
      <Text style={styles.disclosure}>{copy.practiceDisclosure}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl
  },
  hero: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.card,
    gap: spacing.lg,
    minHeight: 170,
    padding: spacing.xl
  },
  micro: {
    ...typography.technical,
    color: colors.statusProcessing
  },
  unavailable: {
    ...typography.heading,
    color: colors.textPrimary
  },
  explanation: {
    ...typography.caption,
    color: colors.textSecondary
  },
  educationSection: {
    gap: spacing.md
  },
  explanationList: {
    gap: spacing.sm
  },
  explanationCard: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  explanationText: {
    flex: 1,
    gap: spacing.xs
  },
  explanationTitle: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary
  },
  explanationDetail: {
    ...typography.caption,
    color: colors.textSecondary
  },
  marker: {
    borderRadius: radius.pill,
    height: 22,
    marginTop: spacing.xxs,
    width: 22
  },
  providerMarker: {
    backgroundColor: colors.statusSuccessSoft
  },
  bookkeepingMarker: {
    backgroundColor: colors.accentSoft
  },
  processingMarker: {
    backgroundColor: colors.statusWarningSoft
  },
  practiceAction: {
    alignItems: "center",
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.pill,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.xl
  },
  practiceText: {
    ...typography.body,
    color: colors.textInverse,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "center"
  },
  practiceArrow: {
    ...typography.body,
    color: colors.textInverse
  },
  disclosure: {
    ...typography.technical,
    color: colors.statusProcessing,
    textAlign: "center"
  },
  pressed: {
    opacity: 0.85
  }
});
