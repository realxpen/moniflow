import { StyleSheet, Text, View } from "react-native";
import { FlowHeader } from "@/components/ui";
import { operatorJourneyStages, operatorStagePosition, type OperatorStage } from "@/services/operator-journey-presentation";
import { colors, radius, spacing, typography } from "@/theme";

type Props = { stage: OperatorStage; eyebrow: string; title: string; description: string };

/** Three pre-approval UI stages; the visual stepper never asserts that money moved. */
export function OperatorJourneyHeader({ stage, eyebrow, title, description }: Props) {
  const selected = operatorStagePosition(stage);
  return (
    <View style={styles.root}>
      <FlowHeader eyebrow={eyebrow} title={title} description={description} />
      <View
        accessible
        accessibilityLabel={`Money Plan review step ${selected + 1} of 3: ${operatorJourneyStages[selected]?.label ?? "unknown"}`}
        style={styles.stages}
      >
        {operatorJourneyStages.map((item, index) => (
          <View key={item.id} style={[
            styles.stage,
            index < selected && styles.past,
            index === selected && styles.active
          ]}>
            <Text style={[styles.number, index === selected && styles.activeText]}>{item.number}</Text>
            <Text style={[styles.label, index === selected && styles.activeText]}>{item.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.disclosure}>PLAN BEFORE EXECUTION · HUMAN CONTROL ALWAYS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  stages: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderWidth: 1,
    borderRadius: radius.lg, flexDirection: "row", gap: spacing.xs, padding: spacing.sm },
  stage: { backgroundColor: colors.backgroundSecondary, borderRadius: radius.md,
    flex: 1, gap: spacing.xxs, minHeight: 64, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  past: { backgroundColor: colors.statusSuccessSoft },
  active: { backgroundColor: colors.surfaceStrong },
  number: { ...typography.technical, color: colors.statusProcessing },
  label: { ...typography.technical, color: colors.textPrimary, fontSize: 10, letterSpacing: 0.2 },
  activeText: { color: colors.textInverse },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
