import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ProgressStep } from "@/components/operator";
import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { mockHomeData } from "@/constants/mockData";
import { parseOperatorIntent, type MoniflowIntent } from "@/services/intent-engine";
import { colors, spacing, typography } from "@/theme";

export default function ProcessingScreen() {
  const params = useLocalSearchParams<{ command?: string; localUserId?: string }>();
  const command = useMemo(
    () => (typeof params.command === "string" && params.command.trim() ? params.command : mockHomeData.command),
    [params.command]
  );
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const [intent, setIntent] = useState<MoniflowIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const parse = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await parseOperatorIntent(command);
        if (active) setIntent(result);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Intent parsing failed safely.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void parse();
    return () => {
      active = false;
    };
  }, [command]);

  const unsupported = intent?.intent === "UNSUPPORTED";
  const canPlan = Boolean(intent && !unsupported && localUserId);

  return (
    <Screen contentContainerStyle={styles.screen}>
      <FlowHeader
        description="Deterministic rules only. MONIFlow does not use an LLM or guess when the instruction is unclear."
        eyebrow="INTENT ENGINE"
        title={unsupported ? "I won’t guess." : "Understanding your instruction."}
      />

      <SoftCard style={styles.commandCard}>
        <Text style={styles.label}>YOUR INSTRUCTION</Text>
        <Text style={styles.command}>{command}</Text>
      </SoftCard>

      <View style={styles.progressCard}>
        <StatusPill
          label={loading ? "PARSING" : error ? "ENGINE ERROR" : unsupported ? "UNSUPPORTED" : "VALIDATED"}
          tone={loading ? "processing" : error || unsupported ? "warning" : "success"}
        />
        <ProgressStep index={1} state={loading ? "active" : "complete"} title="Normalize instruction" detail="Whitespace and exact syntax" />
        <ProgressStep delay={90} index={2} state={loading ? "pending" : "complete"} title="Match supported intent" detail="Deterministic rule table" />
        <ProgressStep delay={180} index={3} state={loading ? "pending" : intent && !unsupported ? "complete" : "pending"} title="Validate structure" detail="Strict Zod contract" />
        <ProgressStep delay={270} index={4} state={canPlan ? "active" : "pending"} title="Prepare Money Plan" detail="Provider-backed balance comes next" />
      </View>

      {intent ? (
        <SoftCard style={styles.resultCard}>
          <Text style={styles.label}>DETERMINISTIC RESULT</Text>
          <Text style={styles.intentName}>{intent.intent}</Text>
          <Text selectable style={styles.json}>{JSON.stringify(intent, null, 2)}</Text>
        </SoftCard>
      ) : null}

      {!localUserId && intent && !unsupported ? (
        <Text style={styles.error}>Complete wallet onboarding before MONIFlow can calculate a provider-backed plan.</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {canPlan ? (
        <PrimaryButton onPress={() => router.push({ pathname: "/operator/plan", params: { command, localUserId } })}>
          Build my Money Plan
        </PrimaryButton>
      ) : (
        <PrimaryButton onPress={() => router.back()} disabled={loading}>
          {loading ? "Parsing…" : "Edit instruction"}
        </PrimaryButton>
      )}

      <Text style={styles.disclosure}>Understanding does not authorize execution. The next screen only explains the financial consequences.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingBottom: spacing.xxl },
  commandCard: { backgroundColor: colors.accentSoft, gap: spacing.sm },
  label: { ...typography.technical, color: colors.statusProcessing },
  command: { ...typography.command, color: colors.textPrimary },
  progressCard: { gap: spacing.xs },
  resultCard: { gap: spacing.sm },
  intentName: { ...typography.heading, color: colors.textPrimary },
  json: { ...typography.caption, color: colors.textSecondary },
  error: { ...typography.caption, color: colors.statusError },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
