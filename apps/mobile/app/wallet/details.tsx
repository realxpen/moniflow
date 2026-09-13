import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { loadFinancialProvider, providerBadge, type FinancialProviderRuntime } from "@/services/runtime";
import {
  loadDepositAccount,
  loadWallet,
  loadWalletBalance,
  type DepositAccount,
  type WalletBalance,
  type WalletSummary
} from "@/services/wallet-dashboard";
import { colors, spacing, typography } from "@/theme";

const configuredLocalUserId = process.env.EXPO_PUBLIC_DEV_LOCAL_USER_ID ?? "";

export default function WalletDetailsScreen() {
  const params = useLocalSearchParams<{ localUserId?: string | string[] }>();
  const routedLocalUserId = Array.isArray(params.localUserId) ? params.localUserId[0] : params.localUserId;
  const localUserId = routedLocalUserId?.trim() || configuredLocalUserId;

  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [depositAccount, setDepositAccount] = useState<DepositAccount | null>(null);
  const [provider, setProvider] = useState<FinancialProviderRuntime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!localUserId) {
      setError("No connected user is available for this wallet view.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextWallet, nextBalance, nextDeposit, nextProvider] = await Promise.all([
        loadWallet(localUserId),
        loadWalletBalance(localUserId),
        loadDepositAccount(localUserId).catch(() => null),
        loadFinancialProvider()
      ]);
      setWallet(nextWallet);
      setBalance(nextBalance);
      setDepositAccount(nextDeposit);
      setProvider(nextProvider);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wallet details could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [localUserId]);

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.heading}>
        <View style={styles.headingRow}>
          <Text style={styles.eyebrow}>WALLET DETAILS</Text>
          <StatusPill label={providerBadge(provider)} tone={provider?.simulated ? "processing" : "success"} />
        </View>
        <Text style={styles.title}>Your CNGN workspace</Text>
        <Text style={styles.subtitle}>Provider-held money and MONIFlow internal allocations remain visibly separate.</Text>
      </View>

      {wallet ? (
        <SoftCard style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>STATUS</Text>
            <StatusPill label={wallet.status.toUpperCase()} tone={wallet.status === "active" ? "success" : "processing"} />
          </View>
          <Detail label="CURRENCY" value={wallet.currency} />
          <Detail label="WALLET ADDRESS" value={wallet.address} />
          <Detail label="PROVIDER WALLET ID" value={wallet.id} />
        </SoftCard>
      ) : null}

      {balance ? (
        <SoftCard style={styles.card}>
          <Text style={styles.sectionTitle}>Balance accounting</Text>
          <Detail label="PROVIDER BALANCE" value={formatNaira(balance.providerBalance)} />
          <Detail label="INTERNAL ALLOCATIONS" value={formatNaira(balance.internalAllocated)} />
          <Detail label="AVAILABLE TO SPEND" value={formatNaira(balance.availableToSpend)} />
          <Text style={styles.subtitle}>Money Spaces are MONIFlow bookkeeping; they do not pretend the provider holds separate sub-balances.</Text>
        </SoftCard>
      ) : null}

      <SoftCard style={styles.card}>
        <Text style={styles.sectionTitle}>NGN deposit rail</Text>
        {depositAccount ? (
          <>
            <Detail label="ACCOUNT NUMBER" value={depositAccount.accountNumber} />
            <Detail label="BANK" value={depositAccount.bankName ?? "Provider bank"} />
            {depositAccount.accountName ? <Detail label="ACCOUNT NAME" value={depositAccount.accountName} /> : null}
          </>
        ) : (
          <Text style={styles.subtitle}>The active provider has not returned an NGN deposit account for this user yet.</Text>
        )}
      </SoftCard>

      {error ? (
        <SoftCard style={styles.card}>
          <StatusPill label="WALLET READ FAILED" tone="warning" />
          <Text style={styles.error}>{error}</Text>
          <PrimaryButton disabled={loading} onPress={() => void load()}>{loading ? "Retrying…" : "Retry"}</PrimaryButton>
        </SoftCard>
      ) : null}

      <PrimaryButton onPress={() => router.replace({ pathname: "/(tabs)/home", params: localUserId ? { localUserId } : undefined })}>
        Back to Home
      </PrimaryButton>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.label}>{label}</Text>
      <Text selectable style={styles.value}>{value}</Text>
    </View>
  );
}

function formatNaira(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 2 })}` : value;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  heading: { gap: spacing.sm },
  headingRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  eyebrow: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.4 },
  title: { ...typography.display, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  card: { gap: spacing.lg },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { ...typography.heading, color: colors.textPrimary },
  detail: { gap: spacing.xs },
  label: { ...typography.technical, color: colors.textSecondary },
  value: { ...typography.body, color: colors.textPrimary },
  error: { ...typography.caption, color: colors.statusError }
});
