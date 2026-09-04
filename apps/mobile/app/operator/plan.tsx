import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { GuardCheck } from "@/components/guard";
import {
  FlowHeader,
  MoneyText,
  PrimaryButton,
  Screen,
  SectionTitle,
  SoftCard,
  StatusPill
} from "@/components/ui";
import { mockDisclosure, mockPlan } from "@/constants/mockData";
import { colors, radius, spacing, typography } from "@/theme";

export default function PlanScreen() {
  return (
    <Screen contentContainerStyle={styles.screen}>
      <FlowHeader
        description="Two separate actions, one understandable consequence. This plan is static mock UI."
        eyebrow="MONEY PLAN · PREVIEW"
        title="Plan before execution."
      />

      <View style={styles.section}>
        <SectionTitle eyebrow="01 · EXTERNAL MOVEMENT" title="Withdraw to bank" />
        <SoftCard style={styles.actionCard}>
          <View style={styles.actionTop}>
            <MoneyText amount={mockPlan.bankWithdrawal} style={styles.actionAmount} />
            <StatusPill label="APPROVAL REQUIRED" tone="warning" />
          </View>
          <Text style={styles.destination}>{mockPlan.destination}</Text>
          <Text style={styles.meta}>Example saved destination · not provider verified</Text>
        </SoftCard>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="02 · INTERNAL ALLOCATION" title="Save to a money space" />
        <SoftCard style={styles.actionCard}>
          <View style={styles.actionTop}>
            <MoneyText amount={mockPlan.pocketAllocation} style={styles.actionAmount} />
            <StatusPill label="INTERNAL" tone="processing" />
          </View>
          <Text style={styles.destination}>{mockPlan.pocket} space</Text>
          <Text style={styles.meta}>Application bookkeeping · no provider-held partition</Text>
        </SoftCard>
      </View>

      <SoftCard style={styles.mathCard}>
        <View style={styles.mathRow}>
          <Text style={styles.mathLabel}>Balance before</Text>
          <Text style={styles.mathValue}>₦300,000</Text>
        </View>
        <View style={styles.mathRow}>
          <Text style={styles.mathLabel}>External + internal</Text>
          <Text style={styles.mathValue}>−₦60,000</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.mathRow}>
          <Text style={styles.totalLabel}>EXPECTED AVAILABLE AFTER</Text>
          <Text style={styles.totalValue}>₦240,000</Text>
        </View>
      </SoftCard>

      <View style={styles.guardCard}>
        <Text style={styles.guardTitle}>MONI GUARD · STATIC CHECKS</Text>
        <GuardCheck rule="SUPPORTED INTENT" message="Both preview actions are in MVP scope." status="pass" />
        <GuardCheck delay={90} rule="HUMAN APPROVAL" message="External movement still needs your approval." status="review" />
      </View>

      <PrimaryButton onPress={() => router.push("/operator/approve")}>
        Review consequences
      </PrimaryButton>
      <Text style={styles.disclosure}>{mockDisclosure}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingBottom: spacing.xxl },
  section: { gap: spacing.md },
  actionCard: { gap: spacing.sm },
  actionTop: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  actionAmount: { ...typography.moneyPlan, flex: 1 },
  destination: { ...typography.section, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary },
  mathCard: { backgroundColor: colors.backgroundSecondary, gap: spacing.md },
  mathRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  mathLabel: { ...typography.body, color: colors.textSecondary },
  mathValue: { ...typography.section, color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  divider: { backgroundColor: colors.borderSoft, height: 1 },
  totalLabel: { ...typography.technical, color: colors.textSecondary, flex: 1 },
  totalValue: { ...typography.heading, color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  guardCard: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: radius.card, borderWidth: 1, padding: spacing.lg },
  guardTitle: { ...typography.technical, color: colors.statusProcessing, marginBottom: spacing.sm },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
