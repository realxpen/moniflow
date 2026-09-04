import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { colors, spacing, typography } from "@/theme";

export default function WelcomeScreen() {
  return (
    <Screen contentContainerStyle={styles.screen} scroll={false}>
      <View style={styles.top}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>MONIFlow</Text>
          <StatusPill label="STATIC PREVIEW" tone="processing" />
        </View>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>MONEY, OPERATED INTELLIGENTLY</Text>
          <Text style={styles.title}>Your financial operator.</Text>
          <Text style={styles.description}>
            Describe the outcome. MONIFlow prepares a clear plan. You remain in control.
          </Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <SoftCard style={styles.principleCard}>
          <Text style={styles.principleLabel}>THE OPERATING PRINCIPLE</Text>
          <Text style={styles.principle}>Intent → Plan → Guard → Human approval</Text>
        </SoftCard>
        <PrimaryButton onPress={() => router.push("/onboarding/identity")}>
          Begin setup preview
        </PrimaryButton>
        <Text style={styles.disclosure}>NO PROFILE, WALLET, OR PROVIDER RECORD IS CREATED</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "space-between", paddingBottom: spacing.xxl, paddingTop: spacing.xl },
  top: { gap: spacing.giant },
  brandRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  brand: { ...typography.section, color: colors.textPrimary },
  hero: { gap: spacing.md },
  eyebrow: { ...typography.technical, color: colors.statusProcessing },
  title: { ...typography.hero, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary, maxWidth: 390 },
  bottom: { gap: spacing.md },
  principleCard: { gap: spacing.xs, padding: spacing.lg },
  principleLabel: { ...typography.technical, color: colors.textSecondary },
  principle: { ...typography.section, color: colors.textPrimary },
  disclosure: { ...typography.technical, color: colors.textSecondary, fontSize: 9, textAlign: "center" }
});
