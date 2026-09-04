import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { mockDisclosure } from "@/constants/mockData";
import { colors, spacing, typography } from "@/theme";

export default function ResultScreen() {
  return (
    <Screen contentContainerStyle={styles.screen} scroll={false}>
      <View style={styles.content}>
        <FlowHeader
          description="A real result will only appear after BMONI reports an appropriate provider state."
          eyebrow="RESULT · PREVIEW"
          title="No money moved."
        />
        <SoftCard style={styles.card}>
          <StatusPill label="NOT SUBMITTED" tone="warning" />
          <Text style={styles.cardTitle}>The static journey is complete.</Text>
          <Text style={styles.cardCopy}>
            The ₦40,000 withdrawal and ₦20,000 internal allocation were shown for navigation and
            consequence review only. No provider success is claimed.
          </Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>PROVIDER REFERENCE</Text>
            <Text style={styles.rowValue}>None</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>FINANCIAL EFFECT</Text>
            <Text style={styles.rowValue}>₦0</Text>
          </View>
        </SoftCard>
      </View>
      <View style={styles.actions}>
        <PrimaryButton onPress={() => router.replace("/(tabs)/activity")}>View activity</PrimaryButton>
        <SecondaryButton onPress={() => router.replace("/(tabs)/home")}>Return home</SecondaryButton>
        <Text style={styles.disclosure}>{mockDisclosure}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, justifyContent: "space-between", paddingBottom: spacing.xxl },
  content: { gap: spacing.xxxl },
  card: { gap: spacing.md },
  cardTitle: { ...typography.heading, color: colors.textPrimary },
  cardCopy: { ...typography.body, color: colors.textSecondary },
  divider: { backgroundColor: colors.borderSoft, height: 1 },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { ...typography.technical, color: colors.textSecondary },
  rowValue: { ...typography.section, color: colors.textPrimary },
  actions: { gap: spacing.sm },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
