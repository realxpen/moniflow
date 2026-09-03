import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, shadows, spacing } from "@/theme";

type SoftCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function SoftCard({ children, style }: SoftCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.xl,
    ...shadows.soft
  }
});
