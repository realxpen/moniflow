import { StyleSheet, Text, View } from "react-native";

import { MoneyText } from "@/components/ui/MoneyText";
import { colors, radius, spacing, typography } from "@/theme";

type PocketCardProps = {
  allocatedAmount: number;
  name: string;
  targetAmount: number;
};

export function PocketCard({ allocatedAmount, name, targetAmount }: PocketCardProps) {
  const progress = Math.min(allocatedAmount / Math.max(targetAmount, 1), 1);
  const percentage = Math.round(progress * 100);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>MONEY POCKET</Text>
        <Text style={styles.percentage}>{percentage}%</Text>
      </View>
      <Text style={styles.name}>{name}</Text>
      <MoneyText amount={allocatedAmount} style={styles.amount} />
      <View
        accessibilityLabel={`${percentage} percent funded`}
        accessibilityRole="progressbar"
        accessibilityValue={{ max: 100, min: 0, now: percentage }}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.target}>Target ₦{targetAmount.toLocaleString("en-NG")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    minWidth: 172,
    padding: spacing.lg
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  eyebrow: { ...typography.technical, color: colors.textSecondary, fontSize: 9 },
  percentage: { ...typography.technical, color: colors.statusSuccess },
  name: { ...typography.section, color: colors.textPrimary },
  amount: { fontSize: 27, lineHeight: 32 },
  track: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.pill,
    height: 7,
    overflow: "hidden"
  },
  fill: {
    backgroundColor: colors.statusSuccess,
    borderRadius: radius.pill,
    height: "100%"
  },
  target: { ...typography.caption, color: colors.textSecondary }
});
