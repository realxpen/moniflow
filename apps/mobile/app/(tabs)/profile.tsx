import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen, SectionTitle, SoftCard, StatusPill } from "@/components/ui";
import { useAppActiveRefresh } from "@/hooks/use-app-active-refresh";
import { getSavedDestination, type VerifiedDestination } from "@/services/banking";
import { loadFinancialProvider, providerBadge, type FinancialProviderRuntime } from "@/services/runtime";
import { loadWallet, loadWalletBalance, type WalletBalance, type WalletSummary } from "@/services/wallet-dashboard";
import { useDemoSession } from "@/store/demo-session";
import { colors, layout, radius, spacing, typography } from "@/theme";

const configuredLocalUserId = process.env.EXPO_PUBLIC_DEV_LOCAL_USER_ID ?? "";

export default function ProfileScreen() {
  const params = useLocalSearchParams<{ localUserId?: string | string[] }>();
  const routedLocalUserId = Array.isArray(params.localUserId) ? params.localUserId[0] : params.localUserId;
  const savedLocalUserId = useDemoSession((state) => state.localUserId);
  const localUserId = routedLocalUserId?.trim() || savedLocalUserId || configuredLocalUserId;

  const [provider, setProvider] = useState<FinancialProviderRuntime | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [destination, setDestination] = useState<VerifiedDestination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const runtime = await loadFinancialProvider();
      setProvider(runtime);
      if (!localUserId) {
        setWallet(null);
        setBalance(null);
        setDestination(null);
        return;
      }
      const [nextWallet, nextBalance, nextDestination] = await Promise.all([
        loadWallet(localUserId),
        loadWalletBalance(localUserId),
        getSavedDestination(localUserId, "GTBank").catch(() => null)
      ]);
      setWallet(nextWallet);
      setBalance(nextBalance);
      setDestination(nextDestination);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workspace status could not be loaded.");
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
          <Text style={styles.eyebrow}>YOUR MONIFLOW</Text>
          <Text style={styles.title}>Financial workspace</Text>
          <Text style={styles.description}>Provider connection, wallet readiness, and verified destinations in one place.</Text>
        </View>
        <StatusPill label={loading ? "CHECKING" : providerBadge(provider)} tone={loading ? "processing" : provider?.simulated ? "processing" : "success"} />
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="READINESS" title="Financial foundations" />
        <SoftCard style={styles.card}>
          <ReadinessRow label="Financial provider" meta={provider ? `${provider.label} · ${provider.environment}` : "Unavailable"} ready={Boolean(provider)} />
          <View style={styles.divider} />
          <ReadinessRow label="CNGN wallet" meta={wallet ? `${wallet.status} · ${shortAddress(wallet.address)}` : "Not connected"} ready={wallet?.status === "active"} />
          <View style={styles.divider} />
          <ReadinessRow label="Spendable balance" meta={balance ? formatNaira(balance.availableToSpend) : "Unavailable"} ready={Boolean(balance)} />
        </SoftCard>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="DESTINATIONS" title="Saved banks" />
        <Pressable
          accessibilityRole="button"
          disabled={!localUserId}
          onPress={() => router.push({ pathname: "/banking/nigeria", params: { localUserId, desiredLabel: "GTBank" } })}
          style={({ pressed }) => [styles.destination, pressed && styles.pressed]}
        >
          <View style={styles.rowCopy}>
            <Text style={styles.rowLabel}>{destination?.bankName ?? "GTBank"}</Text>
            <Text style={styles.rowMeta}>
              {destination ? `${destination.maskedAccountNumber} · ${destination.accountHolderName}` : "No verified GTBank destination saved"}
            </Text>
          </View>
          <Text style={styles.actionLabel}>{destination ? "Review" : "Set up"}</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/onboarding/welcome")}
        style={({ pressed }) => [styles.onboardingLink, pressed && styles.pressed]}
      >
        <Text style={styles.onboardingLabel}>{provider?.provider === "moniflow-sandbox" ? "Manage sandbox workspace" : "Review secure onboarding"}</Text>
      </Pressable>

      {error ? (
        <SoftCard style={styles.card}>
          <StatusPill label="STATUS UNAVAILABLE" tone="warning" />
          <Text style={styles.error}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}>
            <Text style={styles.actionLabel}>Retry</Text>
          </Pressable>
        </SoftCard>
      ) : null}

      <Text style={styles.disclosure}>{provider?.simulated ? "SIMULATED FINANCIAL INFRASTRUCTURE IS LABELLED THROUGHOUT THE WORKSPACE" : "PROVIDER STATUS IS READ FROM THE MONIFLOW API"}</Text>
    </Screen>
  );
}

function ReadinessRow({ label, meta, ready }: { label: string; meta: string; ready: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowMeta}>{meta}</Text>
      </View>
      <StatusPill label={ready ? "READY" : "NOT READY"} tone={ready ? "success" : "warning"} />
    </View>
  );
}

function shortAddress(address: string) {
  return address.length > 14 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address;
}

function formatNaira(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 2 })}` : value;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxxl, paddingBottom: layout.tabContentBottomInset, paddingTop: spacing.xl },
  header: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  copy: { flex: 1, gap: spacing.xs },
  eyebrow: { ...typography.technical, color: colors.textSecondary },
  title: { ...typography.display, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary },
  section: { gap: spacing.md },
  card: { gap: spacing.md },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  rowCopy: { flex: 1, gap: spacing.xxs },
  rowLabel: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  rowMeta: { ...typography.caption, color: colors.textSecondary },
  divider: { backgroundColor: colors.borderSoft, height: 1 },
  destination: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 84,
    padding: spacing.lg
  },
  actionLabel: { ...typography.caption, color: colors.statusProcessing, fontWeight: "600" },
  onboardingLink: { alignItems: "center", borderColor: colors.borderSoft, borderRadius: radius.pill, borderWidth: 1, minHeight: 52, justifyContent: "center" },
  onboardingLabel: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  retry: { alignItems: "center", paddingVertical: spacing.sm },
  error: { ...typography.body, color: colors.statusError },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" },
  pressed: { opacity: 0.7 }
});
