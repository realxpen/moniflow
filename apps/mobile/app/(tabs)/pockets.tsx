import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PocketCard } from "@/components/pockets";
import { Screen, SectionTitle, StatusPill } from "@/components/ui";
import { loadPockets, type Pocket } from "@/services/pockets";
import { colors, layout, radius, spacing, typography } from "@/theme";

const localUserId = process.env.EXPO_PUBLIC_DEV_LOCAL_USER_ID ?? "";

export default function PocketsScreen() {
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!localUserId) { setError("Complete onboarding or configure the development local user."); return; }
    void loadPockets(localUserId).then((result) => { if (!active) return; setPockets(result.pockets); setTotal(result.summary.totalAllocated); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Pockets could not be loaded."); });
    return () => { active = false; };
  }, []);

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>INTERNAL BOOKKEEPING</Text>
          <Text style={styles.title}>Money spaces</Text>
          <Text style={styles.description}>Internal allocations give money a purpose without pretending the provider holds separate balances.</Text>
        </View>
        <StatusPill label="LIVE INTERNAL STATE" tone="success" />
      </View>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>ASSIGNED ACROSS SPACES</Text>
        <Text style={styles.summaryValue}>₦{total.toLocaleString("en-NG")}</Text>
        <Text style={styles.summaryMeta}>MONIFlow bookkeeping · not a provider-held partition</Text>
      </View>
      <View style={styles.section}>
        <SectionTitle eyebrow="YOUR SPACES" title="Purpose, made visible" />
        {pockets.length === 0 ? <Text style={styles.empty}>No allocations yet.</Text> : pockets.map((pocket) => <PocketCard key={pocket.id} allocatedAmount={pocket.allocatedAmount} name={pocket.name} targetAmount={pocket.targetAmount ?? Math.max(pocket.allocatedAmount, 1)} />)}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxxl, paddingBottom: layout.tabContentBottomInset, paddingTop: spacing.xl },
  header: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  copy: { flex: 1, gap: spacing.xs }, eyebrow: { ...typography.technical, color: colors.textSecondary }, title: { ...typography.display, color: colors.textPrimary }, description: { ...typography.body, color: colors.textSecondary },
  summary: { backgroundColor: colors.accentSoft, borderRadius: radius.card, gap: spacing.xs, padding: spacing.xl }, summaryLabel: { ...typography.technical, color: colors.statusProcessing }, summaryValue: { ...typography.display, color: colors.textPrimary, fontVariant: ["tabular-nums"] }, summaryMeta: { ...typography.caption, color: colors.textSecondary },
  section: { gap: spacing.md }, empty: { ...typography.body, color: colors.textSecondary }, error: { ...typography.caption, color: colors.statusError }
});
