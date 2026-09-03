import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, spacing, typography } from "@/theme";

type PillProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function Pill({ children, style }: PillProps) {
  return (
    <View style={[styles.pill, style]}>
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  label: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "500"
  }
});
