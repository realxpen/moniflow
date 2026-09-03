import { BlurView } from "expo-blur";
import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, shadows, spacing } from "@/theme";

type GlassCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function GlassCard({ children, style }: GlassCardProps) {
  return (
    <View style={[styles.shell, style]}>
      <BlurView intensity={35} style={styles.blur} tint="light">
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderColor: colors.borderSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: "hidden",
    ...shadows.floating
  },
  blur: {
    backgroundColor: colors.surfaceGlass,
    padding: spacing.xl
  }
});
