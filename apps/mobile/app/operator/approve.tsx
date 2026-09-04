import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  ConfirmationButton,
  FlowHeader,
  PrimaryButton,
  Screen,
  SoftCard,
  StatusPill
} from "@/components/ui";
import type { MoneyPlan } from "@/services/money-plan";
import type { GuardResult } from "@/services/moniguard";
import { colors, radius, spacing, typography } from "@/theme";

export default function ApprovalScreen() {
  const params = useLocalSearchParams<{ command?: string; localUserId?: string; plan?: string; guard?: string }>();
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const plan = useMemo(() => parseJson<MoneyPlan>(params.plan), [params.plan]);
  const guard = useMemo(() => parseJson<GuardResult>(params.guard), [params.guard]);
  const withdrawal = plan?.actions.find((action) => action.kind === "BANK_WITHDRAWAL");
  const allocations = plan?.actions.filter((action) => action.kind === "ALLOCATE_POCKET") ?? [];
  const guardCleared = guard?.verdict === "REVIEW" && guard.checks.every((check) => check.passed);

  if (!plan || !guardCleared || !withdrawal) {
    return (
      <Screen contentContainerStyle={styles.screen}>
        <FlowHeader
          description="Authorization is unavailable until a valid plan passes MONI Guard."
          eyebrow="AUTHORIZATION GATE"
          title="Guard clearance required."
        />
        <SoftCard style={styles.notice}>
          <StatusPill label="BLOCKED" tone="warning" />
          <Text style={styles.noticeCopy}>Open the Money Plan and run MONI Guard before entering the human authorization flow.</Text>
        </SoftCard>
        <PrimaryButton onPress={() => router.replace({ pathname: "/(tabs)/home", params: { localUserId } })}>
          Return to Home
        </PrimaryButton>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.screen}>
      <FlowHeader
        description="MONI Guard passed every deterministic check. Only you can authorize the external movement."
        eyebrow="HUMAN AUTHORIZATION"
        title="You stay in control."
      />

      <View style={styles.consequenceCard}>
        <Text style={styles.consequenceLabel}>YOU WOULD AUTHORIZE</Text>
        <Text style={styles.amount}>{formatNaira(withdrawal.amount)}</Text>
        <View style={styles.destinationBlock}>
          <Text style={styles.toLabel}>TO</Text>
          <Text style={styles.destination}>{withdrawal.label}</Text>
        </View>
        <View style={styles.darkDivider} />
        <View style={styles.darkRow}>
          <Text style={styles.darkMeta}>Expected available after complete plan</Text>
          <Text style={styles.darkValue}>{formatNaira(plan.totals.availableAfter)}</Text>
        </View>
      </View>

      {allocations.map((allocation) => (
        <SoftCard key={`${allocation.index}-${allocation.label}`} style={styles.allocationCard}>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>{allocation.label} money space</Text>
              <Text style={styles.rowMeta}>Internal allocation included in the guarded plan</Text>
            </View>
            <Text style={styles.rowValue}>{formatNaira(allocation.amount)}</Text>
          </View>
        </SoftCard>
      ))}

      <View style={styles.notice}>
        <StatusPill label="MONI GUARD · REVIEW" tone="warning" />
        <Text style={styles.noticeCopy}>All eight deterministic checks passed. External movement still requires your explicit device authorization.</Text>
      </View>

      <ConfirmationButton
        label="Authorize guarded plan"
        onPress={() => router.push({ pathname: "/operator/signing", params: { localUserId, plan: JSON.stringify(plan) } })}
      />
      <Text style={styles.disclosure}>MONI Guard clearance does not itself move funds or create a signature.</Text>
    </Screen>
  );
}

function parseJson<T>(value: string | string[] | undefined): T | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function formatNaira(amount: number) {
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
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
