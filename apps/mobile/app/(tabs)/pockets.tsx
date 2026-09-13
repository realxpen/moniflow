import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PocketCard } from "@/components/pockets";
import { Screen, SectionTitle, StatusPill } from "@/components/ui";
import { useAppActiveRefresh } from "@/hooks/use-app-active-refresh";
import { loadPockets, type Pocket } from "@/services/pockets";
import { useDemoSession } from "@/store/demo-session";
import { colors, layout, radius, spacing, typography } from "@/theme";

const configuredLocalUserId = process.env.EXPO_PUBLIC_DEV_LOCAL_USER_ID ?? "";

export default function PocketsScreen() {
  const savedLocalUserId = useDemoSession((state) => state.localUserId);
  const localUserId = savedLocalUserId || configuredLocalUserId;
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!localUserId) {
      setError("Complete onboarding or start a sandbox workspace first.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await loadPockets(localUserId);
      setPockets(result.pockets);
      setTotal(result.summary.totalAllocated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pockets could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [localUserId]);

  useEffect(() => { void load(); }, [load]);
  useAppActiveRefresh(load);

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>INTERNAL BOOKKEEPING</Text>
          <Text style={styles.title}>Money spaces</Text>
          <Text style={styles.description}>Internal allocations give money a purpose without pretending the provider holds separate balances.</Text>
        </View>
        <StatusPill label={loading ? "REFRESHING" : "LIVE INTERNAL STATE"} tone={loading ? "processing" : "success"} />
      </View>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>ASSIGNED ACROSS SPACES</Text>
        <Text style={styles.summaryValue}>₦{total.toLocaleString("en-NG")}</Text>
        <Text style={styles.summaryMeta}>MONIFlow bookkeeping · not a provider-held partition</Text>
      </View>
      <View style={styles.section}>
        <SectionTitle eyebrow="YOUR SPACES" title="Purpose, made visible" />
        {pockets.length === 0 && !loading ? <Text style={styles.empty}>No allocations yet.</Text> : pockets.map((pocket) => <PocketCard key={pocket.id} allocatedAmount={pocket.allocatedAmount} name={pocket.name} targetAmount={pocket.targetAmount ?? Math.max(pocket.allocatedAmount, 1)} />)}
      </View>
      {error ? <Text style={styles.error} onPress={() => void load()}>{error} · Tap to retry</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxxl, paddingBottom: layout.tabContentBottomInset, paddingTop: spacing.xl },
  header: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  copy: { flex: 1, gap: spacing.xs },
  eyebrow: { ...typography.technical, color: colors.textSecondary },
  title: { ...typography.display, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary },
  summary: { backgroundColor: colors.accentSoft, borderRadius: radius.card, gap: spacing.xs, padding: spacing.xl },
  summaryLabel: { ...typography.technical, color: colors.statusProcessing },
  summaryValue: { ...typography.display, color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  summaryMeta: { ...typography.caption, color: colors.textSecondary },
  section: { gap: spacing.md },
  empty: { ...typography.body, color: colors.textSecondary },
  error: { ...typography.caption, color: colors.statusError }
});
