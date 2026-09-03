import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/theme";

type StatusTone = "success" | "warning" | "error" | "processing";

type StatusPillProps = {
  label: string;
  tone: StatusTone;
};

const toneStyles = {
  success: { backgroundColor: colors.statusSuccessSoft, color: colors.statusSuccess },
  warning: { backgroundColor: colors.statusWarningSoft, color: colors.statusWarning },
  error: { backgroundColor: colors.statusErrorSoft, color: colors.statusError },
  processing: {
    backgroundColor: colors.statusProcessingSoft,
    color: colors.statusProcessing
  }
} as const;

export function StatusPill({ label, tone }: StatusPillProps) {
  const toneStyle = toneStyles[tone];

  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.backgroundColor }]}>
      <View style={[styles.dot, { backgroundColor: toneStyle.color }]} />
      <Text style={[styles.label, { color: toneStyle.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  dot: {
    borderRadius: radius.pill,
    height: 6,
    width: 6
  },
  label: {
    ...typography.technical
  }
});
