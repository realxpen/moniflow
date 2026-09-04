import { StyleSheet, Text, View } from "react-native";

import { AnimatedEntry } from "@/components/ui/AnimatedEntry";
import { colors, radius, spacing, typography } from "@/theme";

type ProgressStepProps = {
  delay?: number;
  detail?: string;
  index: number;
  state: "complete" | "active" | "pending";
  title: string;
};

const stateLabels = { complete: "DONE", active: "NOW", pending: "NEXT" } as const;

export function ProgressStep({ delay = 0, detail, index, state, title }: ProgressStepProps) {
  return (
    <AnimatedEntry delay={delay}>
      <View style={[styles.row, state === "active" && styles.activeRow]}>
        <View style={[styles.index, styles[`${state}Index`]]}>
          <Text style={[styles.indexLabel, state !== "pending" && styles.inverseLabel]}>
            {String(index).padStart(2, "0")}
          </Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        </View>
        <Text style={[styles.state, styles[`${state}State`]]}>{stateLabels[state]}</Text>
      </View>
    </AnimatedEntry>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 70,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  activeRow: {
    backgroundColor: colors.statusProcessingSoft
  },
  index: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  completeIndex: { backgroundColor: colors.statusSuccess },
  activeIndex: { backgroundColor: colors.statusProcessing },
  pendingIndex: { backgroundColor: colors.backgroundSecondary },
  indexLabel: { ...typography.technical, color: colors.textSecondary },
  inverseLabel: { color: colors.textInverse },
  copy: { flex: 1, gap: spacing.xxs },
  title: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  detail: { ...typography.caption, color: colors.textSecondary },
  state: { ...typography.technical },
  completeState: { color: colors.statusSuccess },
  activeState: { color: colors.statusProcessing },
  pendingState: { color: colors.textSecondary }
});
