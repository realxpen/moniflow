import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, radius, spacing, typography } from "@/theme";

type FlowHeaderProps = {
  description?: string;
  eyebrow: string;
  showBack?: boolean;
  title: string;
};

export function FlowHeader({
  description,
  eyebrow,
  showBack = true,
  title
}: FlowHeaderProps) {
  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        {showBack ? (
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: layout.touchTarget
  },
  back: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: layout.compactTouchTarget,
    paddingHorizontal: spacing.md
  },
  backLabel: { ...typography.caption, color: colors.textPrimary, fontWeight: "600" },
  eyebrow: { ...typography.technical, color: colors.textSecondary },
  title: { ...typography.display, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary, maxWidth: 440 },
  pressed: { opacity: 0.7 }
});
