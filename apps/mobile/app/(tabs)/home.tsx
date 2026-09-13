import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ActivityRow } from "@/components/activity";
import { BalanceCard } from "@/components/balance";
import { PocketCard } from "@/components/pockets";
import {
  OperatorInput,
  PrimaryButton,
  Screen,
  SectionTitle,
  SoftCard,
  StatusPill,
  SuggestionChip
} from "@/components/ui";
import { loadActivity, type FinancialActivity } from "@/services/activity";
import { loadPockets, type Pocket } from "@/services/pockets";
import {
  loadWallet,
  loadWalletBalance,
  type WalletBalance,
  type WalletSummary
} from "@/services/wallet-dashboard";
import { colors, layout, spacing, typography } from "@/theme";

const configuredLocalUserId = process.env.EXPO_PUBLIC_DEV_LOCAL_USER_ID ?? "";
const canonicalCommand = "Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.";
const suggestions = [
  "Check my balance",
  "Withdraw ₦40,000 to my GTBank account",
  "Save ₦20,000 for my laptop",
  "Show my recent activity"
];

export default function HomeScreen() {
  const params = useLocalSearchParams<{ localUserId?: string | string[] }>();
  const routedLocalUserId = Array.isArray(params.localUserId) ? params.localUserId[0] : params.localUserId;
  const localUserId = routedLocalUserId?.trim() || configuredLocalUserId;

  const [command, setCommand] = useState("");
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [activity, setActivity] = useState<FinancialActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!localUserId) {
        if (active) {
          setError("Complete onboarding or bootstrap a development identity to load financial state.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [nextWallet, nextBalance, pocketState, recentActivity] = await Promise.all([
          loadWallet(localUserId),
          loadWalletBalance(localUserId),
          loadPockets(localUserId),
          loadActivity(localUserId, 4)
        ]);
        if (!active) return;
        setWallet(nextWallet);
        setBalance(nextBalance);
        setPockets(pocketState.pockets);
        setActivity(recentActivity);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Financial state could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [localUserId]);

  const availableAmount = balance ? Number.parseFloat(balance.availableToSpend) : null;
  const providerAmount = balance ? Number.parseFloat(balance.providerBalance) : null;
  const internalAllocated = balance ? Number.parseFloat(balance.internalAllocated) : null;
  const providerBadge = balance?.source === "moniflow-sandbox" ? "MONIFLOW SANDBOX" : "BMONI SANDBOX";

  const previewCommand = () => {
    const normalized = command.trim();
    if (!normalized || !localUserId) return;
    router.push({ pathname: "/operator/processing", params: { command: normalized, localUserId } });
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>MONIFlow</Text>
        </View>
        <StatusPill label={providerBadge} tone="processing" />
      </View>

      {wallet && balance && availableAmount !== null && Number.isFinite(availableAmount) ? (
        <>
          <BalanceCard
            actions={
              <PrimaryButton onPress={() => router.push("/bank/select")} style={styles.balanceAction}>
                Manage money
              </PrimaryButton>
            }
            amount={availableAmount}
            label="AVAILABLE TO SPEND"
            status={wallet.status}
          />

          <SoftCard style={styles.accountingCard}>
            <View style={styles.accountingRow}>
              <Text style={styles.technicalLabel}>PROVIDER BALANCE</Text>
              <Text style={styles.accountingValue}>{formatNaira(providerAmount ?? 0)}</Text>
            </View>
            <View style={styles.accountingRow}>
              <Text style={styles.technicalLabel}>IN MONEY SPACES</Text>
              <Text style={styles.accountingValue}>{formatNaira(internalAllocated ?? 0)}</Text>
            </View>
            <Text style={styles.accountingNote}>Money spaces are MONIFlow bookkeeping, not separate provider-held balances.</Text>
          </SoftCard>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/wallet/details", params: { localUserId } })}
          >
            <SoftCard style={styles.walletStrip}>
              <View style={styles.walletStripText}>
                <Text style={styles.technicalLabel}>CNGN WALLET</Text>
                <Text style={styles.walletAddress}>{shortAddress(wallet.address)}</Text>
              </View>
              <Text style={styles.textAction}>Details</Text>
            </SoftCard>
          </Pressable>
        </>
      ) : (
        <SoftCard style={styles.walletState}>
          <StatusPill label={loading ? "LOADING WALLET" : "WALLET UNAVAILABLE"} tone={loading ? "processing" : "warning"} />
          <Text style={styles.walletStateTitle}>{loading ? "Reading financial state…" : "Provider wallet data is not ready."}</Text>
          {error ? <Text style={styles.walletStateCopy}>{error}</Text> : null}
        </SoftCard>
      )}

      <View style={styles.section}>
        <SectionTitle eyebrow="MONIFLOW OPERATOR" title="What should your money do?" />
        <OperatorInput
          actionLabel="Preview plan"
          onChangeText={setCommand}
          onSubmit={previewCommand}
          placeholder="Ask MONIFlow..."
          value={command}
        />
        <View style={styles.suggestions}>
          <Text style={styles.technicalLabel}>DETERMINISTIC INTENTS</Text>
          <View style={styles.chipRow}>
            {suggestions.map((suggestion) => (
              <SuggestionChip key={suggestion} label={suggestion} onPress={() => setCommand(suggestion)} selected={command === suggestion} />
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={() => setCommand(canonicalCommand)} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.demoCommand}>Use the full multi-action demo instruction</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <SectionTitle eyebrow="INTERNAL BOOKKEEPING" title="Money spaces" />
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/(tabs)/pockets", params: { localUserId } })}>
            <Text style={styles.textAction}>See all</Text>
          </Pressable>
        </View>
        {pockets.length > 0 ? (
          <View style={styles.pocketRow}>
            {pockets.slice(0, 2).map((pocket) => (
              <PocketCard
                key={pocket.id}
                allocatedAmount={pocket.allocatedAmount}
                name={pocket.name}
                targetAmount={pocket.targetAmount ?? Math.max(pocket.allocatedAmount, 1)}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyState}>No money spaces yet. Internal allocations from completed plans appear here.</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <SectionTitle eyebrow="FINANCIAL MEMORY" title="Recent" />
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/(tabs)/activity", params: { localUserId } })}>
            <Text style={styles.textAction}>See all</Text>
          </Pressable>
        </View>
        {activity.length > 0 ? (
          <View>
            {activity.map((item) => (
              <ActivityRow
                key={item.id}
                amount={item.amount === null ? "—" : formatNaira(item.amount)}
                label={activityLabel(item)}
                meta={`${item.status} · ${new Date(item.createdAt).toLocaleString()}`}
                source={item.source}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyState}>No completed financial actions yet.</Text>
        )}
      </View>

      <Text style={styles.disclosure}>EXT marks provider movement. INT marks MONIFlow internal bookkeeping.</Text>
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

function formatNaira(amount: number) {
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
}

function shortAddress(address: string) {
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxxl, paddingBottom: layout.tabContentBottomInset, paddingTop: spacing.xl },
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  greetingBlock: { gap: spacing.xxs },
  greeting: { ...typography.caption, color: colors.textSecondary },
  name: { ...typography.heading, color: colors.textPrimary },
  balanceAction: { width: "100%" },
  accountingCard: { gap: spacing.sm },
  accountingRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  accountingValue: { ...typography.section, color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  accountingNote: { ...typography.caption, color: colors.textSecondary },
  walletStrip: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  walletStripText: { gap: spacing.xxs },
  walletAddress: { ...typography.body, color: colors.textPrimary },
  walletState: { gap: spacing.sm },
  walletStateTitle: { ...typography.heading, color: colors.textPrimary },
  walletStateCopy: { ...typography.caption, color: colors.textSecondary },
  section: { gap: spacing.md },
  technicalLabel: { ...typography.technical, color: colors.textSecondary },
  suggestions: { gap: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  demoCommand: { ...typography.caption, color: colors.statusProcessing, fontWeight: "600" },
  sectionRow: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" },
  textAction: { ...typography.caption, color: colors.statusProcessing, fontWeight: "600" },
  pocketRow: { flexDirection: "row", gap: spacing.sm },
  emptyState: { ...typography.body, color: colors.textSecondary },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" },
  pressed: { opacity: 0.65 }
});
