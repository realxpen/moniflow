import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/theme";

type ActivityRowProps = {
  amount: string;
  label: string;
  meta: string;
  source: "provider" | "internal";
};

export function ActivityRow({ amount, label, meta, source }: ActivityRowProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.sourceMark, source === "provider" && styles.providerMark]}>
        <Text style={[styles.sourceLabel, source === "provider" && styles.providerLabel]}>
          {source === "provider" ? "EXT" : "INT"}
        </Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <Text style={styles.amount}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 76,
    paddingVertical: spacing.sm
  },
  sourceMark: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  providerMark: { backgroundColor: colors.statusSuccessSoft },
  sourceLabel: { ...typography.technical, color: colors.statusProcessing, fontSize: 9 },
  providerLabel: { color: colors.statusSuccess },
  copy: { flex: 1, gap: spacing.xxs },
  label: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  meta: { ...typography.caption, color: colors.textSecondary },
  amount: {
    ...typography.section,
    color: colors.textPrimary,
    fontSize: 17,
    fontVariant: ["tabular-nums"]
  }
});
