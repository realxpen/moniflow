import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen, SectionTitle, SoftCard, StatusPill } from "@/components/ui";
import { mockDisclosure } from "@/constants/mockData";
import { colors, layout, radius, spacing, typography } from "@/theme";

export default function ProfileScreen() {
  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>YOUR MONIFLOW</Text>
          <Text style={styles.title}>Ayomide</Text>
          <Text style={styles.description}>The static account and security shell.</Text>
        </View>
        <StatusPill label="SANDBOX UI" tone="processing" />
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="READINESS" title="Financial foundations" />
        <SoftCard style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>Device wallet</Text>
              <Text style={styles.rowMeta}>Not provisioned</Text>
            </View>
            <StatusPill label="NOT CONNECTED" tone="warning" />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>Identity</Text>
              <Text style={styles.rowMeta}>Static preview only</Text>
            </View>
            <StatusPill label="PREVIEW" tone="processing" />
          </View>
        </SoftCard>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="DESTINATIONS" title="Saved banks" />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/bank/select")}
          style={({ pressed }) => [styles.destination, pressed && styles.pressed]}
        >
          <View style={styles.rowCopy}>
            <Text style={styles.rowLabel}>GTBank</Text>
            <Text style={styles.rowMeta}>Example destination · •••• 0194</Text>
          </View>
          <Text style={styles.actionLabel}>Open preview</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/onboarding/welcome")}
        style={({ pressed }) => [styles.onboardingLink, pressed && styles.pressed]}
      >
        <Text style={styles.onboardingLabel}>Review onboarding shell</Text>
      </Pressable>
      <Text style={styles.disclosure}>{mockDisclosure}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxxl, paddingBottom: layout.tabContentBottomInset, paddingTop: spacing.xl },
  header: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  copy: { flex: 1, gap: spacing.xs },
  eyebrow: { ...typography.technical, color: colors.textSecondary },
  title: { ...typography.display, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary },
  section: { gap: spacing.md },
  card: { gap: spacing.md },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  rowCopy: { flex: 1, gap: spacing.xxs },
  rowLabel: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  rowMeta: { ...typography.caption, color: colors.textSecondary },
  divider: { backgroundColor: colors.borderSoft, height: 1 },
  destination: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 84,
    padding: spacing.lg
  },
  actionLabel: { ...typography.caption, color: colors.statusProcessing, fontWeight: "600" },
  onboardingLink: {
    alignItems: "center",
    borderColor: colors.borderSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 52,
    justifyContent: "center"
  },
  onboardingLabel: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" },
  pressed: { opacity: 0.7 }
});
