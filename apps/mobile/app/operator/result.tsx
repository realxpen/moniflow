import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { getExecutionStatus, type ExecutionSnapshot } from "@/services/execution";
import { colors, spacing, typography } from "@/theme";

export default function ResultScreen() {
  const params = useLocalSearchParams<{ localUserId?: string; planId?: string }>();
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const planId = typeof params.planId === "string" ? params.planId : "";
  const [execution, setExecution] = useState<ExecutionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!localUserId || !planId) {
      setError("A persisted execution is required to show a provider-backed result.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setExecution(await getExecutionStatus(planId, localUserId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read BMONI result.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [localUserId, planId]);

  const completed = execution?.state === "COMPLETED";
  const failed = execution?.state === "FAILED";
  const processing = execution && !completed && !failed;

  return (
    <Screen contentContainerStyle={styles.screen} scroll={false}>
      <View style={styles.content}>
        <FlowHeader
          description={completed
            ? "BMONI reports this proposal as completed."
            : failed
              ? "BMONI reports a terminal failure state for this proposal."
              : "This is still a live provider state. MONIFlow does not infer completion."}
          eyebrow="BMONI RESULT"
          title={completed ? "Completed." : failed ? "Not completed." : "Processing."}
        />

        <SoftCard style={styles.card}>
          <StatusPill
            label={loading && !execution ? "CHECKING BMONI" : execution?.providerStatus ?? execution?.state ?? "UNAVAILABLE"}
            tone={completed ? "success" : failed ? "warning" : "processing"}
          />
          <Text style={styles.amount}>{execution ? formatNaira(execution.amount) : "—"}</Text>
          <Text style={styles.cardTitle}>
            {completed ? "Verified by BMONI" : failed ? "Provider execution failed" : "Provider processing continues"}
          </Text>
          <Text style={styles.cardCopy}>
            {completed
              ? "The success state comes from the BMONI proposal response, not from MONIFlow timing or local UI state."
              : failed
                ? "No success is claimed. Review the provider state before attempting any recovery."
                : "Keep this action in PROCESSING until BMONI returns a terminal proposal status."}
          </Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>PROVIDER PROPOSAL</Text>
            <Text style={styles.rowValue}>{execution ? shortId(execution.proposalId) : "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>PROVIDER STATUS</Text>
            <Text style={styles.rowValue}>{execution?.providerStatus ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>MONIFLOW STATE</Text>
            <Text style={styles.rowValue}>{execution?.state ?? "—"}</Text>
          </View>
        </SoftCard>

        {error ? (
          <SoftCard style={styles.card}>
            <StatusPill label="RESULT UNAVAILABLE" tone="warning" />
            <Text style={styles.error}>{error}</Text>
          </SoftCard>
        ) : null}
      </View>

      <View style={styles.actions}>
        {processing || error ? <PrimaryButton disabled={loading} onPress={() => void refresh()}>{loading ? "Checking…" : "Refresh BMONI status"}</PrimaryButton> : null}
        <SecondaryButton onPress={() => router.replace({ pathname: "/(tabs)/home", params: { localUserId } })}>Return home</SecondaryButton>
        <Text style={styles.disclosure}>Only BMONI's proposal state can make an external withdrawal COMPLETED.</Text>
      </View>
    </Screen>
  );
}

function formatNaira(amount: number) {
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
}
function shortId(value: string) { return value.length > 14 ? `${value.slice(0, 7)}…${value.slice(-5)}` : value; }

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, justifyContent: "space-between", paddingBottom: spacing.xxl },
  content: { gap: spacing.xxxl },
  card: { gap: spacing.md },
  amount: { ...typography.display, color: colors.textPrimary },
  cardTitle: { ...typography.heading, color: colors.textPrimary },
  cardCopy: { ...typography.body, color: colors.textSecondary },
  divider: { backgroundColor: colors.borderSoft, height: 1 },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  rowLabel: { ...typography.technical, color: colors.textSecondary },
  rowValue: { ...typography.section, color: colors.textPrimary, flexShrink: 1, textAlign: "right" },
  actions: { gap: spacing.sm },
  error: { ...typography.body, color: colors.statusError },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
