import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

import { colors, radius, spacing, typography } from "@/theme";

type SuggestionChipProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  selected?: boolean;
};

export function SuggestionChip({ label, selected = false, ...props }: SuggestionChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && styles.pressed
      ]}
      {...props}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  selected: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary
  },
  label: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "500"
  },
  selectedLabel: {
    color: colors.textInverse
  },
  pressed: {
    opacity: 0.72
  }
});
