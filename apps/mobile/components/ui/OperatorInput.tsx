import { useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps
} from "react-native";

import { colors, motion, radius, spacing, typography } from "@/theme";

type OperatorInputProps = Omit<TextInputProps, "multiline" | "onSubmitEditing"> & {
  actionLabel?: string;
  onSubmit?: () => void;
};

export function OperatorInput({
  actionLabel = "Create plan",
  onFocus,
  onBlur,
  onSubmit,
  ...props
}: OperatorInputProps) {
  const [focused, setFocused] = useState(false);
  const focus = useRef(new Animated.Value(0)).current;

  const animateFocus = (toValue: number) => {
    Animated.timing(focus, {
      duration: motion.quick,
      toValue,
      useNativeDriver: false
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.shell,
        {
          borderColor: focus.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.borderSoft, colors.accentPrimary]
          })
        }
      ]}
    >
      <Text style={styles.eyebrow}>MONIFLOW OPERATOR</Text>
      <TextInput
        accessibilityLabel="Tell MONIFlow what your money should do"
        multiline
        onBlur={(event) => {
          setFocused(false);
          animateFocus(0);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          animateFocus(1);
          onFocus?.(event);
        }}
        placeholder="What should your money do?"
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, focused && styles.inputFocused]}
        {...props}
      />
      <View style={styles.footer}>
        <Text style={styles.helper}>A plan appears before anything can happen.</Text>
        <Pressable
          accessibilityRole="button"
          disabled={props.editable === false}
          onPress={onSubmit}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 214,
    padding: spacing.xl
  },
  eyebrow: {
    ...typography.technical,
    color: colors.statusProcessing
  },
  input: {
    ...typography.heading,
    color: colors.textPrimary,
    flex: 1,
    marginVertical: spacing.md,
    minHeight: 82,
    padding: 0,
    textAlignVertical: "top"
  },
  inputFocused: {
    minHeight: 96
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  helper: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1
  },
  action: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  actionLabel: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: "600"
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }]
  }
});
