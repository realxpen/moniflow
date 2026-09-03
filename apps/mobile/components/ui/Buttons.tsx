import type { PropsWithChildren } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { colors, radius, spacing, typography } from "@/theme";

type ButtonProps = PropsWithChildren<
  Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle> }
>;

function Button({ children, disabled, style, variant, ...props }: ButtonProps & {
  variant: "primary" | "secondary";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style
      ]}
      {...props}
    >
      <Text style={[styles.label, variant === "primary" && styles.primaryLabel]}>
        {children}
      </Text>
    </Pressable>
  );
}

export function PrimaryButton(props: ButtonProps) {
  return <Button {...props} variant="primary" />;
}

export function SecondaryButton(props: ButtonProps) {
  return <Button {...props} variant="secondary" />;
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radius.pill,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.xl
  },
  primary: {
    backgroundColor: colors.textPrimary
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600"
  },
  primaryLabel: {
    color: colors.textInverse
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  },
  disabled: {
    opacity: 0.42
  }
});
