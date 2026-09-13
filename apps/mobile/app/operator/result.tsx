import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ActivityRow } from "@/components/activity";
import { FlowHeader, PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { loadActivity, type FinancialActivity } from "@/services/activity";
import { finalizeExecution, getExecutionStatus, type ExecutionSnapshot } from "@/services/execution";
import { loadPockets, type Pocket } from "@/services/pockets";
import { loadWalletBalance, type WalletBalance } from "@/services/wallet-dashboard";
import { colors, spacing, typography } from "@/theme";

export default function ResultScreen() {
  const params = useLocalSearchParams<{ localUserId?: string; planId?: string }>();
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const planId = typeof params.planId === "string" ? params.planId : "";
  const [execution, setExecution] = useState<ExecutionSnapshot | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [activity, setActivity] = useState<FinancialActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!localUserId || !planId) {
      setError("A persisted execution is required to show the result.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let snapshot = await getExecutionStatus(planId, localUserId);
      if (snapshot.state === "COMPLETED") snapshot = await finalizeExecution(planId, localUserId);
      setExecution(snapshot);

      if (snapshot.state === "COMPLETED") {
        const [nextBalance, pocketState, recentActivity] = await Promise.all([
          loadWalletBalance(localUserId),
          loadPockets(localUserId),
          loadActivity(localUserId, 10)
        ]);
        setBalance(nextBalance);
        setPockets(pocketState.pockets);
        setActivity(recentActivity.filter((item) => item.metadata.planId === planId));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read the provider result.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [localUserId, planId]);

  const completed = execution?.state === "COMPLETED";
  const failed = execution?.state === "FAILED";
  const processing = execution && !completed && !failed;
  const laptop = pockets.find((pocket) => pocket.name === "Laptop");

  return (
    <Screen contentContainerStyle={styles.screen}>
      <FlowHeader
        description={completed
          ? "Provider completion is confirmed and MONIFlow has finalized internal bookkeeping."
          : failed
            ? "The provider reports a terminal failure state."
            : "This remains a live provider state. MONIFlow does not infer completion."}
        eyebrow="EXECUTION RESULT"
        title={completed ? "Completed." : failed ? "Not completed." : "Processing."}
      />

      <SoftCard style={styles.card}>
        <StatusPill
          label={loading && !execution ? "CHECKING PROVIDER" : execution?.providerStatus ?? execution?.state ?? "UNAVAILABLE"}
          tone={completed ? "success" : failed ? "warning" : "processing"}
        />
        <Text style={styles.amount}>{execution ? formatNaira(execution.amount) : "—"}</Text>
        <Text style={styles.cardTitle}>{completed ? "Provider-confirmed movement" : failed ? "Execution failed" : "Provider processing continues"}</Text>
        <Text style={styles.cardCopy}>
          {completed
            ? "The external movement is provider-confirmed. Internal Money Space allocation is recorded separately by MONIFlow."
            : failed
              ? "No success is claimed. Review the provider state before recovery."
              : "Keep this action in PROCESSING until a terminal provider status arrives."}
        </Text>
      </SoftCard>

      {completed && balance ? (
        <SoftCard style={styles.card}>
          <Text style={styles.technical}>FINAL ACCOUNTING</Text>
          <SummaryRow label="Withdrawal" value={formatNaira(execution?.amount ?? 0)} />
          <SummaryRow label="Laptop allocation" value={formatNaira(laptop?.allocatedAmount ?? 0)} />
          <View style={styles.divider} />
          <SummaryRow label="Provider balance" value={formatMoneyString(balance.providerBalance)} />
          <SummaryRow label="In Money Spaces" value={formatMoneyString(balance.internalAllocated)} />
          <SummaryRow label="Available to spend" value={formatMoneyString(balance.availableToSpend)} strong />
        </SoftCard>
      ) : null}

      {completed ? (
        <View style={styles.section}>
          <Text style={styles.technical}>FINANCIAL MEMORY</Text>
          {activity.map((item) => (
            <ActivityRow
              key={item.id}
              amount={item.amount === null ? "—" : formatNaira(item.amount)}
              label={item.kind === "BANK_WITHDRAWAL" ? "Bank withdrawal" : `${typeof item.metadata.pocketName === "string" ? item.metadata.pocketName : "Money space"} allocation`}
              meta={item.status}
              source={item.source}
            />
          ))}
        </View>
      ) : null}

      {error ? (
        <SoftCard style={styles.card}>
          <StatusPill label="RESULT UNAVAILABLE" tone="warning" />
          <Text style={styles.error}>{error}</Text>
        </SoftCard>
      ) : null}

      <View style={styles.actions}>
        {processing || error ? <PrimaryButton disabled={loading} onPress={() => void refresh()}>{loading ? "Checking…" : "Refresh provider status"}</PrimaryButton> : null}
        <SecondaryButton onPress={() => router.replace({ pathname: "/(tabs)/home", params: { localUserId } })}>Return home</SecondaryButton>
        <Text style={styles.disclosure}>EXT = provider movement. INT = MONIFlow internal bookkeeping.</Text>
      </View>
    </Screen>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>{value}</Text>
    </View>
  );
}

function formatNaira(amount: number) {
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
}
function formatMoneyString(value: string) { return formatNaira(Number.parseFloat(value)); }

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingBottom: spacing.xxxl },
  card: { gap: spacing.md },
  section: { gap: spacing.xs },
  amount: { ...typography.display, color: colors.textPrimary },
  cardTitle: { ...typography.heading, color: colors.textPrimary },
  cardCopy: { ...typography.body, color: colors.textSecondary },
  technical: { ...typography.technical, color: colors.textSecondary },
  divider: { backgroundColor: colors.borderSoft, height: 1 },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  rowLabel: { ...typography.body, color: colors.textSecondary },
  rowValue: { ...typography.section, color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  rowValueStrong: { fontWeight: "700" },
  actions: { gap: spacing.sm },
  error: { ...typography.body, color: colors.statusError },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
