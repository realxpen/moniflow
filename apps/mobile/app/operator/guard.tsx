import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GuardCheck } from "@/components/guard";
import { PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import type { MoniflowIntent } from "@/services/intent-engine";
import type { MoneyPlan } from "@/services/money-plan";
import { runMoniGuard, type GuardResult } from "@/services/moniguard";
import { colors, radius, spacing, typography } from "@/theme";

export default function MoniGuardScreen() {
  const params = useLocalSearchParams<{
    command?: string;
    localUserId?: string;
    intent?: string;
    plan?: string;
  }>();
  const command = typeof params.command === "string" ? params.command : "";
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const intent = useMemo(() => parseJson<MoniflowIntent>(params.intent), [params.intent]);
  const plan = useMemo(() => parseJson<MoneyPlan>(params.plan), [params.plan]);
  const [result, setResult] = useState<GuardResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const evaluate = async () => {
      if (!intent || !plan) {
        setError("MONI Guard requires the validated intent and Money Plan.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const next = await runMoniGuard(intent, plan);
        if (active) setResult(next);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "MONI Guard could not evaluate this plan.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void evaluate();
    return () => {
      active = false;
    };
  }, [intent, plan]);

  const humanApproval = result?.checks.find((check) => check.rule === "HUMAN_APPROVAL");
  const destinationLabel = plan?.actions.find((action) => action.kind === "BANK_WITHDRAWAL")?.label;

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>MONI GUARD</Text>
        <Text style={styles.title}>Nothing moves until the plan survives every check.</Text>
      </View>

      <View style={styles.glassPanel}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.micro}>DETERMINISTIC SAFETY LAYER</Text>
            <Text style={styles.panelTitle}>Plan verification</Text>
          </View>
          <StatusPill
            label={loading ? "CHECKING" : result?.verdict ?? "UNAVAILABLE"}
            tone={loading ? "processing" : result?.verdict === "BLOCK" ? "warning" : result?.verdict === "REVIEW" ? "warning" : "success"}
          />
        </View>

        {loading ? (
          <Text style={styles.loadingCopy}>Running eight explicit rules in sequence…</Text>
        ) : null}

        {result?.checks.map((check, index) => (
          <GuardCheck
            key={check.rule}
            delay={index * 75}
            rule={humanLabel(check.rule, destinationLabel)}
            message={check.message}
            status={check.passed ? (check.rule === "HUMAN_APPROVAL" && check.severity === "warning" ? "review" : "pass") : "block"}
          />
        ))}
      </View>

      {result ? (
        <SoftCard style={styles.verdictCard}>
          <Text style={styles.micro}>HUMAN AUTHORIZATION</Text>
          <Text style={styles.verdictTitle}>
            {result.verdict === "BLOCK"
              ? "DO NOT CONTINUE"
              : result.verdict === "REVIEW"
                ? "REQUIRED"
                : "NOT REQUIRED"}
          </Text>
          <Text style={styles.verdictCopy}>
            {result.verdict === "BLOCK"
              ? "MONI Guard found a critical mismatch. This plan cannot enter the approval or signing flow."
              : result.verdict === "REVIEW"
                ? humanApproval?.message ?? "Human authorization is required before external movement."
                : "All checks passed and this plan contains no external movement requiring device authorization."}
          </Text>
          <View style={styles.safeBand}>
            <Text style={styles.safeBandText}>
              {result.verdict === "BLOCK" ? "BLOCKED" : "SAFE TO CONTINUE"}
            </Text>
          </View>
        </SoftCard>
      ) : null}

      {error ? (
        <SoftCard style={styles.errorCard}>
          <StatusPill label="GUARD ERROR" tone="warning" />
          <Text style={styles.error}>{error}</Text>
        </SoftCard>
      ) : null}

      {result?.verdict === "REVIEW" ? (
        <PrimaryButton
          onPress={() =>
            router.push({
              pathname: "/operator/approve",
              params: { command, localUserId, plan: JSON.stringify(plan), guard: JSON.stringify(result) }
            })
          }
        >
          Continue to human authorization
        </PrimaryButton>
      ) : result?.verdict === "ALLOW" ? (
        <PrimaryButton onPress={() => router.replace({ pathname: "/(tabs)/home", params: { localUserId } })}>
          Return to Home
        </PrimaryButton>
      ) : result?.verdict === "BLOCK" ? (
        <PrimaryButton onPress={() => router.back()}>Return to plan</PrimaryButton>
      ) : null}

      <Text style={styles.disclosure}>MONI Guard is deterministic. It does not call an LLM and it cannot authorize or sign a transaction.</Text>
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

function humanLabel(rule: string, destinationLabel?: string) {
  if (rule === "SUPPORTED_INTENT") return "Supported intent";
  if (rule === "POSITIVE_AMOUNT") return "Positive amounts";
  if (rule === "CURRENCY") return "NGN currency preserved";
  if (rule === "BALANCE") return "Balance sufficient";
  if (rule === "DESTINATION") return destinationLabel ? `${destinationLabel} destination matched` : "Destination integrity";
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
  glassPanel: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.borderSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg
  },
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
