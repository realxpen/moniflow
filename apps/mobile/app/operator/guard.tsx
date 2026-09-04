import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GuardCheck } from "@/components/guard";
import { PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { runMoniGuard, type GuardResult } from "@/services/moniguard";
import { colors, radius, spacing, typography } from "@/theme";

export default function MoniGuardScreen() {
  const params = useLocalSearchParams<{ command?: string; localUserId?: string; planId?: string }>();
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const planId = typeof params.planId === "string" ? params.planId : "";
  const [result, setResult] = useState<GuardResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const evaluate = async () => {
      if (!planId || !localUserId) {
        setError("MONI Guard requires the persisted Money Plan identity.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const next = await runMoniGuard(planId, localUserId);
        if (active) setResult(next);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "MONI Guard could not evaluate this plan.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void evaluate();
    return () => { active = false; };
  }, [localUserId, planId]);

  const humanApproval = result?.checks.find((check) => check.rule === "HUMAN_APPROVAL");

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>MONI GUARD</Text>
        <Text style={styles.title}>Nothing moves until the persisted plan survives every check.</Text>
      </View>

      <View style={styles.glassPanel}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.micro}>DETERMINISTIC SAFETY LAYER</Text>
            <Text style={styles.panelTitle}>Server plan verification</Text>
          </View>
          <StatusPill
            label={loading ? "CHECKING" : result?.verdict ?? "UNAVAILABLE"}
            tone={loading ? "processing" : result?.verdict === "BLOCK" || result?.verdict === "REVIEW" ? "warning" : "success"}
          />
        </View>

        {loading ? <Text style={styles.loadingCopy}>Running eight explicit rules against the stored plan…</Text> : null}

        {result?.checks.map((check, index) => (
          <GuardCheck
            key={check.rule}
            delay={index * 75}
            rule={humanLabel(check.rule)}
            message={check.message}
            status={check.passed ? (check.rule === "HUMAN_APPROVAL" && check.severity === "warning" ? "review" : "pass") : "block"}
          />
        ))}
      </View>

      {result ? (
        <SoftCard style={styles.verdictCard}>
          <Text style={styles.micro}>PLAN STATE</Text>
          <Text style={styles.verdictTitle}>{result.status.replaceAll("_", " ")}</Text>
          <Text style={styles.verdictCopy}>
            {result.verdict === "BLOCK"
              ? "MONI Guard found a critical mismatch. The server marked this plan BLOCKED."
              : result.verdict === "REVIEW"
                ? humanApproval?.message ?? "The server is now waiting for your explicit approval."
                : "No external human authorization is required for this plan."}
          </Text>
          <View style={styles.safeBand}>
            <Text style={styles.safeBandText}>{result.verdict === "BLOCK" ? "BLOCKED" : "GUARD COMPLETE"}</Text>
          </View>
        </SoftCard>
      ) : null}

      {error ? (
        <SoftCard style={styles.errorCard}>
          <StatusPill label="GUARD ERROR" tone="warning" />
          <Text style={styles.error}>{error}</Text>
        </SoftCard>
      ) : null}

      {result?.status === "AWAITING_USER_APPROVAL" ? (
        <PrimaryButton
          onPress={() => router.push({ pathname: "/operator/approve", params: { localUserId, planId } })}
        >
          Continue to human authorization
        </PrimaryButton>
      ) : result?.status === "APPROVED" ? (
        <PrimaryButton onPress={() => router.replace({ pathname: "/(tabs)/home", params: { localUserId } })}>
          Return to Home
        </PrimaryButton>
      ) : result?.status === "BLOCKED" ? (
        <PrimaryButton onPress={() => router.back()}>Return to plan</PrimaryButton>
      ) : null}

      <Text style={styles.disclosure}>The client never supplies the plan to MONI Guard in Phase 11. The API loads the authoritative stored plan by planId.</Text>
    </Screen>
  );
}

function humanLabel(rule: string) {
  if (rule === "SUPPORTED_INTENT") return "Supported intent";
  if (rule === "POSITIVE_AMOUNT") return "Positive amounts";
  if (rule === "CURRENCY") return "NGN currency preserved";
  if (rule === "BALANCE") return "Balance sufficient";
  if (rule === "DESTINATION") return "Destination integrity";
  if (rule === "AMOUNT_INTEGRITY") return "Requested amount preserved";
  if (rule === "PLAN_INTEGRITY") return "Plan totals verified";
  if (rule === "HUMAN_APPROVAL") return "Human authorization boundary";
  return rule;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  hero: { gap: spacing.sm },
  eyebrow: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.6 },
  title: { ...typography.display, color: colors.textPrimary, maxWidth: 560 },
  glassPanel: { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderSoft, borderRadius: radius.card, borderWidth: 1, gap: spacing.xs, padding: spacing.lg },
  panelHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.sm },
  micro: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.2 },
  panelTitle: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.xxs },
  loadingCopy: { ...typography.body, color: colors.textSecondary, paddingVertical: spacing.lg },
  verdictCard: { gap: spacing.md },
  verdictTitle: { ...typography.display, color: colors.textPrimary },
  verdictCopy: { ...typography.body, color: colors.textSecondary },
  safeBand: { backgroundColor: colors.textPrimary, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  safeBandText: { ...typography.technical, color: colors.backgroundPrimary, letterSpacing: 1.4, textAlign: "center" },
  errorCard: { gap: spacing.md },
  error: { ...typography.body, color: colors.statusError },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
