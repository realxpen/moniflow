import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import {
  ConfirmationButton,
  FlowHeader,
  Screen,
  SoftCard,
  StatusPill
} from "@/components/ui";
import { mockDisclosure, mockPlan } from "@/constants/mockData";
import { colors, radius, spacing, typography } from "@/theme";

export default function ApprovalScreen() {
  return (
    <Screen contentContainerStyle={styles.screen}>
      <FlowHeader
        description="Review the amount and destination without distraction. Approval here advances UI only."
        eyebrow="CONSEQUENCE MODE"
        title="You stay in control."
      />

      <View style={styles.consequenceCard}>
        <Text style={styles.consequenceLabel}>YOU WOULD AUTHORIZE</Text>
        <Text style={styles.amount}>₦40,000</Text>
        <View style={styles.destinationBlock}>
          <Text style={styles.toLabel}>TO</Text>
          <Text style={styles.destination}>{mockPlan.destination}</Text>
        </View>
        <View style={styles.darkDivider} />
        <View style={styles.darkRow}>
          <Text style={styles.darkMeta}>Expected available after both actions</Text>
          <Text style={styles.darkValue}>₦240,000</Text>
        </View>
      </View>

      <SoftCard style={styles.allocationCard}>
        <View style={styles.row}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowLabel}>Laptop money space</Text>
            <Text style={styles.rowMeta}>Internal allocation after approval preview</Text>
          </View>
          <Text style={styles.rowValue}>₦20,000</Text>
        </View>
      </SoftCard>

      <View style={styles.notice}>
        <StatusPill label="NO EXECUTION" tone="warning" />
        <Text style={styles.noticeCopy}>
          This Phase 3 control is not a financial authorization. It does not call BMONI, sign a
          payload, or move funds.
        </Text>
      </View>

      <ConfirmationButton
        label="Approve static preview"
        onPress={() => router.push("/operator/signing")}
      />
      <Text style={styles.disclosure}>{mockDisclosure}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingBottom: spacing.xxl },
  consequenceCard: { backgroundColor: colors.surfaceStrong, borderRadius: radius.card, gap: spacing.lg, padding: spacing.xl },
  consequenceLabel: { ...typography.technical, color: colors.accentSoft },
  amount: { ...typography.hero, color: colors.textInverse },
  destinationBlock: { gap: spacing.xs },
  toLabel: { ...typography.technical, color: colors.textSecondary },
  destination: { ...typography.heading, color: colors.textInverse },
  darkDivider: { backgroundColor: colors.borderInverseSoft, height: 1 },
  darkRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  darkMeta: { ...typography.caption, color: colors.backgroundSecondary, flex: 1 },
  darkValue: { ...typography.section, color: colors.textInverse },
  allocationCard: { padding: spacing.lg },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  rowCopy: { flex: 1, gap: spacing.xxs },
  rowLabel: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  rowMeta: { ...typography.caption, color: colors.textSecondary },
  rowValue: { ...typography.section, color: colors.textPrimary },
  notice: { gap: spacing.sm },
  noticeCopy: { ...typography.caption, color: colors.textSecondary },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
