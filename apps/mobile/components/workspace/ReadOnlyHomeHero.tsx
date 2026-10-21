import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/theme";

type ReadOnlyHomeHeroProps = {
  checking: boolean;
  onOpenPractice: () => void;
};

/**
 * Signed-in Home presentation only.
 *
 * Intentionally accepts no wallet balance, provider status, local user ID,
 * destination or transaction handler. Provider money remains unavailable until
 * the separate identity, ownership, KYC and rail readiness gates are proven.
 */
export function ReadOnlyHomeHero({ checking, onOpenPractice }: ReadOnlyHomeHeroProps) {
  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.technical}>AVAILABLE BALANCE</Text>
        <Text style={styles.unavailable}>Not available yet</Text>
        <Text style={styles.explanation}>
          {checking
            ? "Checking your MONIFlow account session. No provider balance is being read."
            : "No balance is assumed or estimated. Provider funds remain hidden until wallet ownership and financial access are independently confirmed."}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try a safe MONIFlow money example"
        accessibilityHint="Opens offline Learning and Practice. No provider accounts or funds are accessed."
        onPress={onOpenPractice}
        style={({ pressed }) => [styles.operatorCard, pressed && styles.pressed]}
      >
        <Text style={styles.operatorEyebrow}>✦  MONIFLOW OPERATOR · OFFLINE PRACTICE</Text>
        <Text style={styles.operatorQuestion}>What should your money do?</Text>
        <View style={styles.operatorAction}>
          <Text style={styles.operatorActionText}>Try a safe money example</Text>
          <Text style={styles.arrow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            →
          </Text>
        </View>
        <Text style={styles.practiceDisclosure}>
          ILLUSTRATIVE ONLY · NO REAL BALANCE · NO BANK VERIFICATION · NO MONEY MOVEMENT
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg
  },
  balanceCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.card,
    minHeight: 170,
    overflow: "hidden",
    padding: spacing.xl,
    gap: spacing.md
  },
  technical: {
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
  operatorCard: {
    borderRadius: radius.card,
    backgroundColor: colors.surfaceStrong,
    padding: spacing.xl,
    gap: spacing.lg
  },
  operatorEyebrow: {
    ...typography.technical,
    color: colors.accentSoft
  },
  operatorQuestion: {
    ...typography.heading,
    color: colors.textInverse
  },
  operatorAction: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  operatorActionText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
    flexShrink: 1
  },
  arrow: {
    ...typography.body,
    color: colors.statusProcessing,
    fontSize: 23
  },
  practiceDisclosure: {
    ...typography.technical,
    color: colors.accentSoft,
    fontSize: 10
  },
  pressed: {
    opacity: 0.85
  }
});
