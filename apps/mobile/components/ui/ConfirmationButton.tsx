import { Pressable, StyleSheet, Text, Vibration, type PressableProps } from "react-native";

import { colors, radius, spacing, typography } from "@/theme";

type ConfirmationButtonProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
};

export function ConfirmationButton({ label, onPress, ...props }: ConfirmationButtonProps) {
  return (
    <Pressable
      accessibilityHint="Confirms the financial action shown above"
      accessibilityRole="button"
      onPress={(event) => {
        Vibration.vibrate(10);
        onPress?.(event);
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      {...props}
    >
      <Text style={styles.eyebrow}>EXPLICIT CONFIRMATION</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.textPrimary,
    borderRadius: radius.xl,
    gap: spacing.xxs,
    justifyContent: "center",
    minHeight: 68,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md
  },
  eyebrow: { ...typography.technical, color: colors.accentSoft, fontSize: 9 },
  label: { ...typography.body, color: colors.textInverse, fontWeight: "600" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] }
});
