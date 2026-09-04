import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ProgressStep } from "@/components/operator";
import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { getExecutionStatus, type ExecutionSnapshot } from "@/services/execution";
import { colors, spacing, typography } from "@/theme";

export default function ExecutionScreen() {
  const params = useLocalSearchParams<{ localUserId?: string; planId?: string }>();
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const planId = typeof params.planId === "string" ? params.planId : "";
  const [execution, setExecution] = useState<ExecutionSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(true);

  const refresh = async () => {
    if (!localUserId || !planId) {
      setError("Execution status requires the persisted plan identity.");
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      setExecution(await getExecutionStatus(planId, localUserId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read BMONI provider status.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 4000);
    return () => clearInterval(timer);
  }, [localUserId, planId]);

  const terminal = execution?.state === "COMPLETED" || execution?.state === "FAILED";

  useEffect(() => {
    if (!terminal) return;
    const timer = setTimeout(() => {
      router.replace({ pathname: "/operator/result", params: { localUserId, planId } });
    }, 650);
    return () => clearTimeout(timer);
  }, [terminal, localUserId, planId]);

  return (
    <Screen contentContainerStyle={styles.screen}>
      <FlowHeader
        eyebrow="MOVING YOUR MONEY"
        title={execution?.state === "COMPLETED" ? "BMONI completed the proposal." : execution?.state === "FAILED" ? "BMONI did not complete the proposal." : "BMONI is processing your approved action."}
        description="This screen reads the provider proposal directly. MONIFlow never marks the withdrawal complete on its own."
      />

      <SoftCard style={styles.card}>
        <StatusPill
          label={refreshing && !execution ? "CHECKING BMONI" : execution?.providerStatus ?? execution?.state ?? "UNAVAILABLE"}
          tone={execution?.state === "COMPLETED" ? "success" : execution?.state === "FAILED" ? "warning" : "processing"}
        />
        <Text style={styles.amount}>{execution ? formatNaira(execution.amount) : "—"}</Text>
        <Text style={styles.meta}>Proposal {execution ? shortId(execution.proposalId) : "—"}</Text>
      </SoftCard>

      <View style={styles.steps}>
        <ProgressStep index={1} state="complete" title="MONI Guard" detail="Authoritative persisted plan passed" />
        <ProgressStep index={2} state="complete" title="You approved" detail="Approval hash matched at execution time" />
        <ProgressStep index={3} state="complete" title="Proposal prepared" detail="BMONI Nigerian offramp proposal" />
        <ProgressStep index={4} state="complete" title="Secure signing" detail="Raw proposal hash signed on-device" />
        <ProgressStep index={5} state={execution?.state === "COMPLETED" ? "complete" : execution?.state === "FAILED" ? "complete" : "active"} title="BMONI processing" detail={execution?.providerStatus ?? "Reading provider status"} />
      </View>

      {error ? (
        <SoftCard style={styles.card}>
          <StatusPill label="STATUS CHECK FAILED" tone="warning" />
          <Text style={styles.error}>{error}</Text>
          <PrimaryButton disabled={refreshing} onPress={() => void refresh()}>Retry provider status</PrimaryButton>
        </SoftCard>
      ) : null}

      {terminal ? (
        <PrimaryButton onPress={() => router.replace({ pathname: "/operator/result", params: { localUserId, planId } })}>
          View result
        </PrimaryButton>
      ) : null}

      <Text style={styles.disclosure}>A non-terminal provider state remains PROCESSING. No success state is inferred from elapsed time.</Text>
    </Screen>
  );
}

function formatNaira(amount: number) {
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
}
function shortId(value: string) { return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value; }

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingBottom: spacing.xxxl },
  card: { gap: spacing.md },
  amount: { ...typography.display, color: colors.textPrimary },
  meta: { ...typography.technical, color: colors.textSecondary },
  steps: { gap: spacing.xs },
  error: { ...typography.body, color: colors.statusError },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
