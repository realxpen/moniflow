import { AuthenticatedWorkspace } from "@/components/AuthenticatedWorkspace";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ActivityRow } from "@/components/activity";
import { Screen, SectionTitle, StatusPill } from "@/components/ui";
import { useAppActiveRefresh } from "@/hooks/use-app-active-refresh";
import { loadActivity, type FinancialActivity } from "@/services/activity";
import { useAuthSession } from "@/services/auth-session";
import { workspaceIdentity } from "@/services/flow-recovery";
import { useDemoSession } from "@/store/demo-session";
import { colors, layout, radius, spacing, typography } from "@/theme";

const configuredLocalUserId = process.env.EXPO_PUBLIC_DEV_LOCAL_USER_ID ?? "";

/**
 * Production builds always use the JWT-owned workspace overview.
 * The historical tab implementation is retained for isolated __DEV__ only.
 */
export default function ActivityScreen() {
  return __DEV__ ? <LegacyActivityScreen /> : <AuthenticatedWorkspace tab="activity" />;
}

function LegacyActivityScreen() {
  const savedLocalUserId = useDemoSession((state) => state.localUserId);
  const signedIn = useAuthSession();
  const localUserId = workspaceIdentity({
    savedId: savedLocalUserId, devId: configuredLocalUserId,
    authUserId: signedIn?.userId ?? null, development: __DEV__
  });
  const [activity, setActivity] = useState<FinancialActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++activeRequest.current;
    if (!localUserId) {
      setActivity([]);
      setError("Complete onboarding or start a sandbox workspace first.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await loadActivity(localUserId);
      if (requestId !== activeRequest.current) return;
      setActivity(result);
    } catch (cause) {
      if (requestId === activeRequest.current) setError(cause instanceof Error ? cause.message : "Activity could not be loaded.");
    } finally {
      if (requestId === activeRequest.current) setLoading(false);
    }
  }, [localUserId]);

  useEffect(() => {
    setActivity([]);
    return () => { activeRequest.current++; };
  }, [localUserId]);

  useEffect(() => { void load(); }, [load]);
  useAppActiveRefresh(load);

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>FINANCIAL MEMORY</Text>
          <Text style={styles.title}>Activity</Text>
          <Text style={styles.description}>Provider-confirmed movement and MONIFlow internal bookkeeping remain visibly distinct.</Text>
        </View>
        <StatusPill label={loading ? "REFRESHING" : error || !localUserId ? "NOT READY" : "PERSISTED"}
          tone={loading ? "processing" : error || !localUserId ? "warning" : "success"} />
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>SOURCE LABELS</Text>
        <Text style={styles.legendCopy}>EXT = provider movement. INT = MONIFlow internal bookkeeping.</Text>
      </View>
      <View style={styles.section}>
        <SectionTitle eyebrow="RECENT" title="Financial memory" />
        {activity.length === 0 && !loading ? <Text style={styles.empty}>No completed financial actions yet.</Text> : activity.map((item) => <ActivityRow key={item.id} amount={item.amount === null ? "—" : `₦${item.amount.toLocaleString("en-NG")}`} label={activityLabel(item)} meta={`${item.status} · ${new Date(item.createdAt).toLocaleString()}`} source={item.source} />)}
      </View>
      {error ? <Text style={styles.error} onPress={() => void load()}>{error} · Tap to retry</Text> : null}
    </Screen>
  );
}

function activityLabel(item: FinancialActivity) {
  if (item.kind === "BANK_WITHDRAWAL") return "Bank withdrawal";
  if (item.kind === "POCKET_ALLOCATION") {
    const name = typeof item.metadata.pocketName === "string" ? item.metadata.pocketName : "Money space";
    return `${name} allocation`;
  }
  return item.kind.replaceAll("_", " ").toLowerCase();
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxxl, paddingBottom: layout.tabContentBottomInset, paddingTop: spacing.xl },
  header: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  copy: { flex: 1, gap: spacing.xs },
  eyebrow: { ...typography.technical, color: colors.textSecondary },
  title: { ...typography.display, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary },
  legend: { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderSoft, borderRadius: radius.xl, borderWidth: 1, gap: spacing.xs, padding: spacing.lg },
  legendTitle: { ...typography.technical, color: colors.statusProcessing },
  legendCopy: { ...typography.caption, color: colors.textSecondary },
  section: { gap: spacing.xs },
  empty: { ...typography.body, color: colors.textSecondary },
  error: { ...typography.caption, color: colors.statusError }
});
