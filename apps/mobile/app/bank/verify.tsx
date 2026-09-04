import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { mockDisclosure } from "@/constants/mockData";
import { colors, spacing, typography } from "@/theme";

export default function BankVerifyScreen() {
  return (
    <Screen contentContainerStyle={styles.screen} scroll={false}>
      <View style={styles.content}>
        <FlowHeader
          description="Provider-backed account-name verification is not connected in Phase 3."
          eyebrow="BANK PREVIEW · 02"
          title="Verify before movement."
        />
        <SoftCard style={styles.card}>
          <StatusPill label="EXAMPLE ONLY" tone="warning" />
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>BANK</Text>
            <Text style={styles.detailValue}>GTBank</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>ACCOUNT</Text>
            <Text style={styles.detailValue}>•••• 0194</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>ACCOUNT HOLDER</Text>
            <Text style={styles.detailValue}>Not provider verified</Text>
          </View>
        </SoftCard>
        <Text style={styles.notice}>
          The static flow never presents a guessed account holder as verified.
        </Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton onPress={() => router.push("/bank/success")}>
          Continue static preview
        </PrimaryButton>
        <Text style={styles.disclosure}>{mockDisclosure}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, justifyContent: "space-between", paddingBottom: spacing.xxl },
  content: { gap: spacing.xxxl },
  card: { gap: spacing.md },
  detail: { gap: spacing.xxs },
  detailLabel: { ...typography.technical, color: colors.textSecondary },
  detailValue: { ...typography.section, color: colors.textPrimary },
  divider: { backgroundColor: colors.borderSoft, height: 1 },
  notice: { ...typography.caption, color: colors.statusWarning },
  actions: { gap: spacing.sm },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
