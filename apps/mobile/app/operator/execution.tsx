import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ProgressStep } from "@/components/operator";
import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { useAppActiveRefresh } from "@/hooks/use-app-active-refresh";
import { finalizeExecution, getExecutionStatus, type ExecutionSnapshot } from "@/services/execution";
import { useDemoSession } from "@/store/demo-session";
import { colors, spacing, typography } from "@/theme";

export default function ExecutionScreen() {
  const params = useLocalSearchParams<{ localUserId?: string; planId?: string }>();
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const planId = typeof params.planId === "string" ? params.planId : "";
  const setFlowStage = useDemoSession((state) => state.setFlowStage);
  const [execution, setExecution] = useState<ExecutionSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const requestInFlight = useRef(false);

  useEffect(() => {
    if (localUserId && planId) setFlowStage("execution", { planId });
  }, [localUserId, planId, setFlowStage]);

  const refresh = useCallback(async () => {
    if (requestInFlight.current) return;
    if (!localUserId || !planId) {
      setError("Execution status requires the persisted plan identity.");
      setRefreshing(false);
      return;
    }

    requestInFlight.current = true;
    setRefreshing(true);
    setError(null);
    try {
      const snapshot = await getExecutionStatus(planId, localUserId);
      setExecution(snapshot.state === "COMPLETED" ? await finalizeExecution(planId, localUserId) : snapshot);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read provider status.");
    } finally {
      requestInFlight.current = false;
      setRefreshing(false);
    }
  }, [localUserId, planId]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 4000);
    return () => clearInterval(timer);
  }, [refresh]);
  useAppActiveRefresh(refresh);

  const terminal = execution?.state === "COMPLETED" || execution?.state === "FAILED";

  useEffect(() => {
    if (!terminal) return;
    setFlowStage("result", { planId });
    const timer = setTimeout(() => {
      router.replace({ pathname: "/operator/result", params: { localUserId, planId } });
    }, 650);
    return () => clearTimeout(timer);
  }, [localUserId, planId, setFlowStage, terminal]);

  return (
    <Screen contentContainerStyle={styles.screen}>
      <FlowHeader
        eyebrow="EXECUTION"
        title={execution?.state === "COMPLETED" ? "Provider completed the action." : execution?.state === "FAILED" ? "Provider did not complete the action." : "Provider is processing your approved action."}
        description="MONIFlow only finalizes internal bookkeeping after provider completion is confirmed."
      />
      <SoftCard style={styles.card}>
        <StatusPill
          label={refreshing && !execution ? "CHECKING PROVIDER" : execution?.providerStatus ?? execution?.state ?? "UNAVAILABLE"}
          tone={execution?.state === "COMPLETED" ? "success" : execution?.state === "FAILED" ? "warning" : "processing"}
        />
        <Text style={styles.amount}>{execution ? formatNaira(execution.amount) : "—"}</Text>
        <Text style={styles.meta}>Proposal {execution ? shortId(execution.proposalId) : "—"}</Text>
      </SoftCard>
      <View style={styles.steps}>
        <ProgressStep index={1} state="complete" title="MONI Guard" detail="Persisted plan passed" />
        <ProgressStep index={2} state="complete" title="You approved" detail="Approval integrity matched" />
        <ProgressStep index={3} state="complete" title="Proposal prepared" detail="Provider execution created" />
        <ProgressStep index={4} state="complete" title="Secure signing" detail="Proposal digest signed through the active provider path" />
        <ProgressStep index={5} state={terminal ? "complete" : "active"} title="Provider processing" detail={execution?.providerStatus ?? "Reading provider status"} />
      </View>
      {error ? (
        <SoftCard style={styles.card}>
          <StatusPill label="STATUS CHECK FAILED" tone="warning" />
          <Text style={styles.error}>{error}</Text>
          <PrimaryButton disabled={refreshing} onPress={() => void refresh()}>{refreshing ? "Checking…" : "Retry provider status"}</PrimaryButton>
        </SoftCard>
      ) : null}
      {terminal ? (
        <PrimaryButton onPress={() => router.replace({ pathname: "/operator/result", params: { localUserId, planId } })}>View result</PrimaryButton>
      ) : null}
      <Text style={styles.disclosure}>No success state is inferred from elapsed time. Backgrounding the app does not stop provider truth checks.</Text>
    </Screen>
  );
}

function formatNaira(amount: number) {
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
}
function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}
const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingBottom: spacing.xxxl },
  card: { gap: spacing.md },
  amount: { ...typography.display, color: colors.textPrimary },
  meta: { ...typography.technical, color: colors.textSecondary },
  steps: { gap: spacing.xs },
  error: { ...typography.body, color: colors.statusError },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
