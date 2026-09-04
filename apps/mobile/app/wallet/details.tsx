import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import {
  loadDepositAccount,
  loadWallet,
  type DepositAccount,
  type WalletSummary
} from "@/services/wallet-dashboard";
import { colors, spacing, typography } from "@/theme";

const configuredLocalUserId = process.env.EXPO_PUBLIC_DEV_LOCAL_USER_ID ?? "";

export default function WalletDetailsScreen() {
  const params = useLocalSearchParams<{ localUserId?: string | string[] }>();
  const routedLocalUserId = Array.isArray(params.localUserId) ? params.localUserId[0] : params.localUserId;
  const localUserId = routedLocalUserId?.trim() || configuredLocalUserId;

  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [depositAccount, setDepositAccount] = useState<DepositAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!localUserId) {
        setError("No sandbox user is connected to this wallet view.");
        return;
      }
      try {
        const [nextWallet, nextDeposit] = await Promise.all([
          loadWallet(localUserId),
          loadDepositAccount(localUserId).catch(() => null)
        ]);
        if (!active) return;
        setWallet(nextWallet);
        setDepositAccount(nextDeposit);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Wallet details could not be loaded.");
      }
    };
    void load();
    return () => { active = false; };
  }, [localUserId]);

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>WALLET DETAILS</Text>
        <Text style={styles.title}>Your CNGN wallet</Text>
        <Text style={styles.subtitle}>Technical identifiers stay here so Home can remain focused on money, not infrastructure.</Text>
      </View>

      {wallet ? (
        <SoftCard style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>STATUS</Text>
            <StatusPill label={wallet.status.toUpperCase()} tone={wallet.status === "active" ? "success" : "processing"} />
          </View>
          <Detail label="CURRENCY" value={wallet.currency} />
          <Detail label="WALLET ADDRESS" value={wallet.address} />
          <Detail label="BMONI WALLET ID" value={wallet.id} />
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
          <Text style={styles.subtitle}>BMONI has not returned an NGN deposit account for this user yet.</Text>
        )}
      </SoftCard>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton onPress={() => router.back()}>Back to Home</PrimaryButton>
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

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  heading: { gap: spacing.sm },
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
