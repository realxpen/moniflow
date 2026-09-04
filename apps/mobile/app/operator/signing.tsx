import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ProgressStep } from "@/components/operator";
import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { getExecutionReadiness } from "@/services/approval";
import { colors, spacing, typography } from "@/theme";

export default function SigningScreen() {
  const params = useLocalSearchParams<{ localUserId?: string; planId?: string }>();
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const planId = typeof params.planId === "string" ? params.planId : "";
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!localUserId || !planId) {
        setError("A persisted approved plan is required before device signing.");
        setLoading(false);
        return;
      }
      try {
        const result = await getExecutionReadiness(planId, localUserId);
        if (!active) return;
        setReady(result.canExecute && result.approvalHashMatches);
        if (!result.canExecute) setError(result.message ?? "This plan is not approved for execution.");
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Approval state could not be verified.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void check();
    return () => { active = false; };
  }, [localUserId, planId]);

  return (
    <Screen contentContainerStyle={styles.screen}>
      <FlowHeader
        description="Phase 11 verifies that this exact persisted plan is approved before the device-signing boundary can open."
        eyebrow="DEVICE BOUNDARY"
        title="Approval first. Signing next."
      />
      <SoftCard style={styles.card}>
        <StatusPill label={loading ? "VERIFYING APPROVAL" : ready ? "APPROVAL VERIFIED" : "BLOCKED"} tone={loading ? "processing" : ready ? "success" : "warning"} />
        <Text style={styles.cardTitle}>{ready ? "The approved plan fingerprint still matches." : "Device signing is unavailable."}</Text>
        <Text style={styles.cardCopy}>
          {ready
            ? "No BMONI proposal or transaction signature is created in Phase 11. Phase 12 must reuse this server execution gate before requesting a signing payload."
            : error ?? "MONIFlow requires an approved, unchanged Money Plan."}
        </Text>
      </SoftCard>
      <View style={styles.steps}>
        <ProgressStep index={1} state={ready ? "complete" : "active"} title="Human approval" detail={ready ? "Persisted server state: APPROVED" : "Required before any execution path"} />
        <ProgressStep index={2} state={ready ? "active" : "pending"} title="Device signature" detail="Phase 12 — not executed here" />
        <ProgressStep index={3} state="pending" title="Provider submission" detail="No BMONI financial proposal is created in Phase 11" />
      </View>
      <PrimaryButton onPress={() => router.replace({ pathname: "/(tabs)/home", params: { localUserId } })}>
        Return to Home
      </PrimaryButton>
      <Text style={styles.disclosure}>Direct navigation to this route cannot bypass approval because readiness is checked against the persisted server plan.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.backgroundSecondary, gap: spacing.md },
  cardTitle: { ...typography.heading, color: colors.textPrimary },
  cardCopy: { ...typography.body, color: colors.textSecondary },
  steps: { gap: spacing.xs },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
