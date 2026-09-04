import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { MoneyText, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import type { MoniflowIntent } from "@/services/intent-engine";
import { prepareMoneyPlan, type MoneyPlan } from "@/services/money-plan";
import { colors, radius, spacing, typography } from "@/theme";

export default function PlanScreen() {
  const params = useLocalSearchParams<{ command?: string; localUserId?: string; intent?: string }>();
  const command = typeof params.command === "string" ? params.command : "";
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const intent = useMemo(() => parseIntentParam(params.intent), [params.intent]);
  const [plan, setPlan] = useState<MoneyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!intent || !localUserId) {
        setError("MONIFlow needs the validated Phase 8 intent and wallet identity to prepare this plan.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await prepareMoneyPlan(intent, localUserId);
        if (active) setPlan(result);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Money Plan could not be prepared.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [intent, localUserId]);

  const hasMoneyMovement = useMemo(
    () => Boolean(plan && plan.totals.totalCommitted > 0),
    [plan]
  );

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>YOUR MONEY PLAN</Text>
        <Text style={styles.heroTitle}>See the consequence before anything moves.</Text>
      </View>

      {loading ? (
        <SoftCard style={styles.stateCard}>
          <StatusPill label="BUILDING PLAN" tone="processing" />
          <Text style={styles.stateTitle}>Reading your available CNGN balance…</Text>
          <Text style={styles.stateCopy}>The plan uses the provider-backed balance and the already-validated intent.</Text>
        </SoftCard>
      ) : null}

      {plan ? (
        <>
          <View style={styles.currentBlock}>
            <Text style={styles.metaLabel}>CURRENT</Text>
            <MoneyText amount={plan.currentAvailable} style={styles.currentMoney} />
            <Text style={styles.availableWord}>Available</Text>
          </View>

          <View style={styles.actionGrid}>
            {plan.actions.map((action) => (
              <SoftCard key={`${action.index}-${action.kind}`} style={styles.actionCard}>
                <View style={styles.actionHeader}>
                  <Text style={styles.actionIndex}>{String(action.index).padStart(2, "0")}</Text>
                  <StatusPill
                    label={action.movement === "EXTERNAL" ? "EXTERNAL" : action.movement === "INTERNAL" ? "INTERNAL" : "NO MOVEMENT"}
                    tone={action.movement === "EXTERNAL" ? "warning" : action.movement === "INTERNAL" ? "processing" : "neutral"}
                  />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
                {action.amount > 0 ? <MoneyText amount={action.amount} style={styles.actionMoney} /> : null}
              </SoftCard>
            ))}
          </View>

          <View style={styles.summaryGrid}>
            <SoftCard style={styles.summaryCard}>
              <Text style={styles.metaLabel}>EXTERNAL MOVEMENT</Text>
              <MoneyText amount={plan.totals.externalMovement} style={styles.summaryMoney} />
            </SoftCard>
            <SoftCard style={styles.summaryCard}>
              <Text style={styles.metaLabel}>INTERNAL ALLOCATION</Text>
              <MoneyText amount={plan.totals.internalAllocation} style={styles.summaryMoney} />
            </SoftCard>
          </View>

          <View style={styles.afterCard}>
            <Text style={styles.afterLabel}>AVAILABLE AFTER</Text>
            <MoneyText amount={plan.totals.availableAfter} style={styles.afterMoney} />
            <Text style={styles.formula}>
              {formatNaira(plan.currentAvailable)} − {formatNaira(plan.totals.externalMovement)} − {formatNaira(plan.totals.internalAllocation)}
            </Text>
            <Text style={styles.afterCopy}>Available means money not withdrawn and not logically committed to a pocket.</Text>
          </View>

          {plan.totals.availableAfter < 0 ? (
            <SoftCard style={styles.warningCard}>
              <StatusPill label="NEGATIVE OUTCOME" tone="warning" />
              <Text style={styles.stateCopy}>This plan exceeds the current available balance. Phase 9 shows the arithmetic exactly; Guard enforcement belongs to the next safety stage.</Text>
            </SoftCard>
          ) : null}

          <PrimaryButton
            onPress={() => router.push({ pathname: "/operator/approve", params: { command, localUserId, plan: JSON.stringify(plan) } })}
            disabled={!hasMoneyMovement}
          >
            {hasMoneyMovement ? "Review consequences" : "No money movement to approve"}
          </PrimaryButton>
        </>
      ) : null}

      {error ? (
        <SoftCard style={styles.stateCard}>
          <StatusPill label="PLAN UNAVAILABLE" tone="warning" />
          <Text style={styles.stateTitle}>I couldn’t prepare this Money Plan.</Text>
          <Text style={styles.error}>{error}</Text>
          <PrimaryButton onPress={() => router.back()}>Back</PrimaryButton>
        </SoftCard>
      ) : null}

      <Text style={styles.disclosure}>This is a consequence preview only. No withdrawal, allocation, signing, or execution happens on this screen.</Text>
    </Screen>
  );
}

function parseIntentParam(value: string | string[] | undefined): MoniflowIntent | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MoniflowIntent;
  } catch {
    return null;
  }
}

function formatNaira(amount: number) {
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  hero: { gap: spacing.sm },
  eyebrow: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.5 },
  heroTitle: { ...typography.display, color: colors.textPrimary, maxWidth: 520 },
  currentBlock: { gap: spacing.xxs, paddingVertical: spacing.md },
  metaLabel: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.1 },
  currentMoney: { fontSize: 54, lineHeight: 60 },
  availableWord: { ...typography.body, color: colors.textSecondary },
  actionGrid: { gap: spacing.md },
  actionCard: { gap: spacing.sm, minHeight: 190 },
  actionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  actionIndex: { ...typography.technical, color: colors.textSecondary, fontSize: 18 },
  actionLabel: { ...typography.heading, color: colors.textPrimary, fontSize: 28, lineHeight: 34 },
  actionDescription: { ...typography.body, color: colors.textSecondary },
  actionMoney: { fontSize: 34, lineHeight: 40 },
  summaryGrid: { flexDirection: "row", gap: spacing.sm },
  summaryCard: { flex: 1, gap: spacing.sm, minHeight: 130 },
  summaryMoney: { fontSize: 27, lineHeight: 32 },
  afterCard: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.card,
    gap: spacing.sm,
    padding: spacing.xl
  },
  afterLabel: { ...typography.technical, color: colors.backgroundPrimary, opacity: 0.7, letterSpacing: 1.2 },
  afterMoney: { color: colors.backgroundPrimary, fontSize: 50, lineHeight: 56 },
  formula: { ...typography.technical, color: colors.backgroundPrimary, opacity: 0.72 },
  afterCopy: { ...typography.caption, color: colors.backgroundPrimary, opacity: 0.68 },
  stateCard: { gap: spacing.md },
  stateTitle: { ...typography.heading, color: colors.textPrimary },
  stateCopy: { ...typography.body, color: colors.textSecondary },
  warningCard: { gap: spacing.sm },
  error: { ...typography.body, color: colors.statusError },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
