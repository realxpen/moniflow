import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GuardCheck } from "@/components/guard";
import { OperatorJourneyHeader } from "@/components/operator/OperatorJourneyHeader";
import { PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { runMoniGuard, type GuardResult } from "@/services/moniguard";
import { guardDecisionPresentation } from "@/services/operator-journey-presentation";
import { useDemoSession } from "@/store/demo-session";
import { colors, radius, spacing, typography } from "@/theme";

export default function MoniGuardScreen() {
  const params = useLocalSearchParams<{ command?: string; localUserId?: string; planId?: string }>();
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const planId = typeof params.planId === "string" ? params.planId : "";
  const setFlowStage = useDemoSession((state) => state.setFlowStage);
  const [result, setResult] = useState<GuardResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const evaluate = async () => {
    if (!planId || !localUserId) {
      setError("MONI Guard requires the persisted Money Plan identity.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await runMoniGuard(planId, localUserId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "MONI Guard could not evaluate this plan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localUserId && planId) setFlowStage("guard", { planId });
    void evaluate();
  }, [localUserId, planId, setFlowStage]);

  const humanApproval = result?.checks.find((check) => check.rule === "HUMAN_APPROVAL");
  const destinationBlocked = Boolean(result?.checks.find((check) => check.rule === "DESTINATION" && !check.passed));
  const verdictView = guardDecisionPresentation(result?.verdict, loading);

  const openApproval = () => {
    setFlowStage("approve", { planId });
    router.push({ pathname: "/operator/approve", params: { localUserId, planId } });
  };

  const openSigning = () => {
    setFlowStage("signing", { planId });
    router.push({ pathname: "/operator/signing", params: { localUserId, planId } });
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <OperatorJourneyHeader
        stage="guard"
        eyebrow="MONI GUARD"
        title="Nothing moves until the persisted plan survives every check."
        description="Deterministic rules check the stored plan. REVIEW is not financial approval or execution."
      />

      <View style={styles.glassPanel}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.micro}>DETERMINISTIC SAFETY LAYER</Text>
            <Text style={styles.panelTitle}>Server plan verification</Text>
          </View>
          <StatusPill
            label={verdictView.label}
            tone={verdictView.tone}
          />
        </View>

        {loading ? <Text style={styles.loadingCopy}>Running explicit rules against the stored plan…</Text> : null}
        {!loading && result?.checks.map((check, index) => (
          <GuardCheck
            key={check.rule}
            delay={index * 75}
            rule={humanLabel(check.rule)}
            message={providerNeutralMessage(check.message)}
            status={check.passed ? (check.rule === "HUMAN_APPROVAL" && check.severity === "warning" ? "review" : "pass") : "block"}
          />
        ))}
      </View>

      {result && !loading ? (
        <SoftCard style={[styles.verdictCard, result.verdict === "BLOCK" && styles.blockedVerdict, result.verdict === "REVIEW" && styles.reviewVerdict]}>
          <Text style={styles.micro}>PLAN STATE</Text>
          <Text style={styles.verdictTitle}>{result.status.replaceAll("_", " ")}</Text>
          <Text style={styles.verdictCopy}>
            {result.verdict === "BLOCK"
              ? destinationBlocked
                ? "This withdrawal destination has not yet been verified and registered with the active financial provider. Verify it before approval can begin."
                : "MONI Guard found a critical mismatch. The server marked this plan BLOCKED."
              : result.verdict === "REVIEW"
                ? humanApproval?.message ?? "The server is now waiting for your explicit approval."
                : "No external human authorization is required for this plan."}
          </Text>
          <View style={styles.safeBand}>
            <Text style={styles.safeBandText}>{verdictView.completionLabel}</Text>
          </View>
        </SoftCard>
      ) : null}

      {error ? (
        <SoftCard style={styles.errorCard}>
          <StatusPill label="GUARD ERROR" tone="warning" />
          <Text style={styles.error}>{error}</Text>
          <SecondaryButton disabled={loading} onPress={() => void evaluate()}>Retry MONI Guard</SecondaryButton>
        </SoftCard>
      ) : null}

      {!loading && result?.status === "AWAITING_USER_APPROVAL" ? (
        <PrimaryButton onPress={openApproval}>Continue to human authorization</PrimaryButton>
      ) : !loading && result?.status === "APPROVED" ? (
        <PrimaryButton onPress={openSigning}>Continue to secure execution</PrimaryButton>
      ) : !loading && result?.status === "BLOCKED" && destinationBlocked ? (
        <PrimaryButton onPress={() => router.push({ pathname: "/banking/nigeria", params: { localUserId, planId, desiredLabel: "GTBank" } })}>
          Resolve bank destination
        </PrimaryButton>
      ) : !loading && result?.status === "BLOCKED" ? (
        <PrimaryButton onPress={() => router.back()}>Return to plan</PrimaryButton>
      ) : null}

      <Text style={styles.disclosure}>The client never supplies the authoritative plan to MONI Guard. The API loads it by planId and checks external destinations against persisted provider verification.</Text>
    </Screen>
  );
}

function providerNeutralMessage(message: string) {
  return message.replaceAll("BMONI", "provider");
}

function humanLabel(rule: string) {
  if (rule === "SUPPORTED_INTENT") return "Supported intent";
  if (rule === "POSITIVE_AMOUNT") return "Positive amounts";
  if (rule === "CURRENCY") return "NGN currency preserved";
  if (rule === "BALANCE") return "Spendable balance sufficient";
  if (rule === "DESTINATION") return "Bank destination verified";
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
  glassPanel: { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderSoft, borderRadius: radius.card, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  panelHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.sm },
  micro: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.2 },
  panelTitle: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.xxs },
  loadingCopy: { ...typography.body, color: colors.textSecondary, paddingVertical: spacing.lg },
  verdictCard: { gap: spacing.md },
  reviewVerdict: { backgroundColor: colors.statusWarningSoft },
  blockedVerdict: { backgroundColor: colors.statusErrorSoft },
  verdictTitle: { ...typography.display, color: colors.textPrimary },
  verdictCopy: { ...typography.body, color: colors.textSecondary },
  safeBand: { backgroundColor: colors.textPrimary, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  safeBandText: { ...typography.technical, color: colors.backgroundPrimary, letterSpacing: 1.4, textAlign: "center" },
  errorCard: { gap: spacing.md },
  error: { ...typography.body, color: colors.statusError },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
