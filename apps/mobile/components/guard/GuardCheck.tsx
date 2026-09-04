import { StyleSheet, Text, View } from "react-native";

import { AnimatedEntry } from "@/components/ui/AnimatedEntry";
import { colors, radius, spacing, typography } from "@/theme";

type GuardCheckProps = {
  delay?: number;
  message: string;
  rule: string;
  status: "pass" | "review" | "block";
};

const tones = {
  pass: { background: colors.statusSuccessSoft, foreground: colors.statusSuccess, label: "PASS" },
  review: { background: colors.statusWarningSoft, foreground: colors.statusWarning, label: "REVIEW" },
  block: { background: colors.statusErrorSoft, foreground: colors.statusError, label: "BLOCK" }
} as const;

export function GuardCheck({ delay = 0, message, rule, status }: GuardCheckProps) {
  const tone = tones[status];

  return (
    <AnimatedEntry delay={delay}>
      <View style={styles.row}>
        <View style={[styles.marker, { backgroundColor: tone.background }]}>
          <Text style={[styles.markerLabel, { color: tone.foreground }]}>{tone.label}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.rule}>{rule}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </AnimatedEntry>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
    paddingVertical: spacing.sm
  },
  marker: {
    alignItems: "center",
    borderRadius: radius.pill,
    justifyContent: "center",
    minWidth: 64,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  markerLabel: {
    ...typography.technical,
    fontSize: 9
  },
  copy: {
    flex: 1,
    gap: spacing.xxs
  },
  rule: {
    ...typography.technical,
    color: colors.textSecondary
  },
  message: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "500"
  }
});
