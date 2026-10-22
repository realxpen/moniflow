import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { useAppActiveRefresh } from "@/hooks/use-app-active-refresh";
import { currentAuthSession, useAuthSession } from "@/services/auth-session";
import {
  financialRecoveryDescriptions, loadFinancialRecovery,
  type FinancialRecoverySnapshot
} from "@/services/financial-recovery";
import { colors, spacing, typography } from "@/theme";

export default function FinancialRecoveryScreen() {
  const auth = useAuthSession();
  const [snapshot, setSnapshot] = useState<{ subjectId: string; data: FinancialRecoverySnapshot } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const version = useRef(0);

  const refresh = useCallback(async () => {
    const sequence = ++version.current;
    const subjectId = auth?.userId;
    setSnapshot(null);
    if (!subjectId) return;
    setLoading(true);
    setError(null);
    const current = () => sequence === version.current &&
      currentAuthSession()?.userId.toLowerCase() === subjectId.toLowerCase();
    try {
      const data = await loadFinancialRecovery();
      if (current() && data.userId.toLowerCase() === subjectId.toLowerCase()) {
        setSnapshot({ subjectId, data });
      }
    } catch (cause) {
      if (current()) setError(cause instanceof Error ? cause.message : "Recovery review is unavailable.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [auth?.userId]);

  useEffect(() => {
    void refresh();
    return () => { version.current++; };
  }, [refresh]);
  useAppActiveRefresh(refresh);

  const active = auth?.userId;
  const visible = active && snapshot?.subjectId.toLowerCase() === active.toLowerCase() &&
    snapshot.data.userId.toLowerCase() === active.toLowerCase()
    ? snapshot.data : null;

  return (
    <Screen contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>ACCOUNT SAFETY · READ ONLY</Text>
      <Text style={styles.heading}>Financial recovery</Text>
      <Text style={styles.body}>
        Review locally recorded money-preparation attempts. No provider account is queried,
        no funds are released, and no payment is retried here.
      </Text>
      <StatusPill label={loading ? "CHECKING LOCAL RECORDS" : "MANUAL REVIEW ONLY"} tone="processing" />

      {!active ? (
        <SoftCard style={styles.card}>
          <Text style={styles.body}>Sign in to inspect recovery cases for your own MONIFlow account.</Text>
          <SecondaryButton onPress={() => router.replace("/auth/sign-in")}>Sign in</SecondaryButton>
        </SoftCard>
      ) : (
        <>
          {error ? (
            <SoftCard style={styles.card}>
              <Text style={styles.warning}>{error}</Text>
              <Text style={styles.body}>Unavailable does not mean settled, failed, or safe to retry.</Text>
            </SoftCard>
          ) : null}

          {visible ? (
            <>
              <SoftCard style={styles.card}>
                <Text style={styles.eyebrow}>RECOVERY OVERVIEW</Text>
                <Text style={styles.sectionTitle}>{visible.visibleCaseCount} local case(s)</Text>
                <Text style={styles.body}>
                  {visible.hasMore
                    ? "Showing the first 25 cases. Additional local records may exist."
                    : visible.visibleCaseCount === 0
                      ? "No local preparation records were found. This does not verify external provider history."
                      : "Every case remains reserved until an independently authorized reconciliation process is available."}
                </Text>
              </SoftCard>
              {visible.cases.map(item => {
                const description = financialRecoveryDescriptions[item.state];
                return (
                  <SoftCard style={styles.card} key={item.planId}>
                    <StatusPill label="REVIEW REQUIRED" tone="warning" />
                    <Text style={styles.sectionTitle}>{description.title}</Text>
                    <Text style={styles.body}>{description.detail}</Text>
                    <Text style={styles.mono}>Plan reference: …{item.planId.slice(-8)}</Text>
                    <Text style={styles.mono}>Local record: {item.recordedAt.slice(0, 10)}</Text>
                  </SoftCard>
                );
              })}
            </>
          ) : null}

          <View style={styles.actions}>
            <SecondaryButton disabled={loading} onPress={() => void refresh()}>
              {loading ? "Checking…" : "Refresh local review"}
            </SecondaryButton>
            <SecondaryButton onPress={() => router.replace("/(tabs)/profile")}>Back to Profile</SecondaryButton>
          </View>
        </>
      )}

      <Text style={styles.footer}>
        LOCAL RECORDS ONLY · PROVIDER SETTLEMENT NOT VERIFIED · AUTO-RETRY DISABLED · AUTO-RELEASE DISABLED
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  eyebrow: { ...typography.technical, color: colors.statusProcessing },
  heading: { ...typography.heading, color: colors.textPrimary },
  sectionTitle: { ...typography.section, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
  card: { gap: spacing.md },
  warning: { ...typography.body, color: colors.statusError },
  mono: { ...typography.technical, color: colors.textSecondary },
  actions: { gap: spacing.md },
  footer: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
