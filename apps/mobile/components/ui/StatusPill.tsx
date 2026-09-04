import { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { colors, radius, spacing, typography } from "@/theme";

type StatusTone = "neutral" | "success" | "warning" | "error" | "processing";

type StatusPillProps = {
  label: string;
  tone: StatusTone;
};

const toneStyles = {
  neutral: { backgroundColor: colors.backgroundPrimary, color: colors.textSecondary },
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
  const reducedMotion = useReducedMotion();
  const dotOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (tone !== "processing" || reducedMotion) {
      dotOpacity.setValue(1);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, {
          duration: 700,
          toValue: 0.35,
          useNativeDriver: Platform.OS !== "web"
        }),
        Animated.timing(dotOpacity, {
          duration: 700,
          toValue: 1,
          useNativeDriver: Platform.OS !== "web"
        })
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [dotOpacity, reducedMotion, tone]);

  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.backgroundColor }]}>
      <Animated.View
        style={[styles.dot, { backgroundColor: toneStyle.color, opacity: dotOpacity }]}
      />
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
