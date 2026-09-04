import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ActivityRow } from "@/components/activity";
import { BalanceCard } from "@/components/balance";
import { PocketCard } from "@/components/pockets";
import {
  BottomSheet,
  OperatorInput,
  PrimaryButton,
  Screen,
  SectionTitle,
  SecondaryButton,
  SoftCard,
  StatusPill,
  SuggestionChip
} from "@/components/ui";
import { mockDisclosure, mockHomeData } from "@/constants/mockData";
import {
  loadDepositAccount,
  loadWallet,
  loadWalletBalance,
  type DepositAccount,
  type WalletBalance,
  type WalletSummary
} from "@/services/wallet-dashboard";
import { colors, layout, spacing, typography } from "@/theme";

const configuredLocalUserId = process.env.EXPO_PUBLIC_DEV_LOCAL_USER_ID ?? "";

export default function HomeScreen() {
  const params = useLocalSearchParams<{ localUserId?: string | string[] }>();
  const routedLocalUserId = Array.isArray(params.localUserId) ? params.localUserId[0] : params.localUserId;
  const localUserId = routedLocalUserId?.trim() || configuredLocalUserId;

  const [command, setCommand] = useState("");
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [depositAccount, setDepositAccount] = useState<DepositAccount | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);

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
          setWalletError("Complete the sandbox onboarding flow to load provider-backed wallet data.");
          setWalletLoading(false);
        }
        return;
      }

      setWalletLoading(true);
      setWalletError(null);
      try {
        const [nextWallet, nextBalance, nextDepositAccount] = await Promise.all([
          loadWallet(localUserId),
          loadWalletBalance(localUserId),
          loadDepositAccount(localUserId).catch(() => null)
        ]);
        if (!active) return;
        setWallet(nextWallet);
        setBalance(nextBalance);
        setDepositAccount(nextDepositAccount);
      } catch (cause) {
        if (!active) return;
        setWalletError(cause instanceof Error ? cause.message : "Wallet data could not be loaded.");
      } finally {
        if (active) setWalletLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [localUserId]);

  const availableAmount = balance ? Number.parseFloat(balance.amount) : null;
  const previewCommand = () => {
    const normalized = command.trim();
    if (!normalized) return;
    router.push({ pathname: "/operator/processing", params: { command: normalized } });
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{mockHomeData.firstName}</Text>
        </View>
        <StatusPill label="BMONI SANDBOX" tone="processing" />
      </View>

      {wallet && balance && availableAmount !== null && Number.isFinite(availableAmount) ? (
        <>
          <BalanceCard
            actions={
              <>
                <SecondaryButton onPress={() => setShowAddMoney(true)} style={styles.balanceAction}>
                  Add money
                </SecondaryButton>
                <PrimaryButton
                  onPress={() => router.push("/bank/select")}
                  style={styles.balanceAction}
                >
                  Withdraw
                </PrimaryButton>
              </>
            }
            amount={availableAmount}
            label="AVAILABLE"
            status={wallet.status}
          />

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
          <StatusPill
            label={walletLoading ? "LOADING WALLET" : "WALLET UNAVAILABLE"}
            tone={walletLoading ? "processing" : "warning"}
          />
          <Text style={styles.walletStateTitle}>
            {walletLoading ? "Reading your BMONI wallet…" : "Provider wallet data is not ready."}
          </Text>
          {walletError ? <Text style={styles.walletStateCopy}>{walletError}</Text> : null}
        </SoftCard>
      )}

      <View style={styles.section}>
        <SectionTitle eyebrow="MONIFLOW OPERATOR" title="What should your money do?" />
        <OperatorInput
          actionLabel="Preview intent"
          onChangeText={setCommand}
          onSubmit={previewCommand}
          placeholder="Ask MONIFlow..."
          value={command}
        />
        <View style={styles.suggestions}>
          <Text style={styles.technicalLabel}>SUPPORTED IN PHASE 8</Text>
          <View style={styles.chipRow}>
            {mockHomeData.suggestions.map((suggestion) => (
              <SuggestionChip
                key={suggestion}
                label={suggestion}
                onPress={() => setCommand(suggestion)}
                selected={command === suggestion}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setCommand(mockHomeData.command)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.demoCommand}>Use the full multi-action demo instruction</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <SectionTitle eyebrow="INTERNAL BOOKKEEPING" title="Money spaces" />
          <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/pockets")}>
            <Text style={styles.textAction}>See all</Text>
          </Pressable>
        </View>
        <View style={styles.pocketRow}>
          {mockHomeData.pockets.map((pocket) => (
            <PocketCard key={pocket.name} {...pocket} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <SectionTitle eyebrow="MOCK ACTIVITY" title="Recent" />
          <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/activity")}>
            <Text style={styles.textAction}>See all</Text>
          </Pressable>
        </View>
        <View>
          {mockHomeData.activity.map((item) => (
            <ActivityRow key={item.label} {...item} />
          ))}
        </View>
      </View>

      <Text style={styles.disclosure}>{mockDisclosure}</Text>

      <BottomSheet
        onClose={() => setShowAddMoney(false)}
        title="Add money"
        visible={showAddMoney}
      >
        {depositAccount ? (
          <View style={styles.depositDetails}>
            <Text style={styles.technicalLabel}>NGN VIRTUAL ACCOUNT</Text>
            <Text style={styles.accountNumber}>{depositAccount.accountNumber}</Text>
            <Text style={styles.sheetCopy}>{depositAccount.bankName ?? "BMONI banking partner"}</Text>
            {depositAccount.accountName ? <Text style={styles.sheetCopy}>{depositAccount.accountName}</Text> : null}
            <Text style={styles.sheetCopy}>Transfer NGN to this account. BMONI credits the connected smart wallet as CNGN.</Text>
          </View>
        ) : (
          <Text style={styles.sheetCopy}>
            An NGN virtual account is not available from BMONI yet. It appears after the Nigeria rail is active and the provider has issued the deposit account.
          </Text>
        )}
        <PrimaryButton onPress={() => setShowAddMoney(false)}>Done</PrimaryButton>
      </BottomSheet>
    </Screen>
  );
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
  balanceAction: { flex: 1, minWidth: 0 },
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
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" },
  sheetCopy: { ...typography.body, color: colors.textSecondary },
  depositDetails: { gap: spacing.xs },
  accountNumber: { ...typography.display, color: colors.textPrimary },
  pressed: { opacity: 0.65 }
});
