import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import {
  getNigerianBanks,
  getSavedDestination,
  registerNigerianBankAccount,
  verifyNigerianBankAccount,
  type NigerianBank,
  type VerifiedDestination
} from "@/services/banking";
import { loadFinancialProvider, providerBadge, providerName, type FinancialProviderRuntime } from "@/services/runtime";
import { colors, radius, spacing, typography } from "@/theme";

export default function NigerianBankScreen() {
  const params = useLocalSearchParams<{ localUserId?: string; planId?: string; desiredLabel?: string }>();
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const planId = typeof params.planId === "string" ? params.planId : "";
  const desiredLabel = typeof params.desiredLabel === "string" && params.desiredLabel.trim() ? params.desiredLabel.trim() : "GTBank";

  const [provider, setProvider] = useState<FinancialProviderRuntime | null>(null);
  const [savedDestination, setSavedDestination] = useState<VerifiedDestination | null>(null);
  const [banks, setBanks] = useState<NigerianBank[]>([]);
  const [selected, setSelected] = useState<NigerianBank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [label, setLabel] = useState(desiredLabel);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!localUserId) {
      setError("A connected MONIFlow identity is required before choosing a bank destination.");
      setBusy(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const [nextProvider, existing] = await Promise.all([
        loadFinancialProvider(),
        getSavedDestination(localUserId, desiredLabel)
      ]);
      setProvider(nextProvider);
      setSavedDestination(existing);
      if (existing) return;

      const nextBanks = await getNigerianBanks(localUserId);
      setBanks(nextBanks);
      const preferred = nextBanks.find((bank) => bank.name.toLowerCase().includes("guaranty trust") || bank.name.toLowerCase().includes("gtbank"));
      setSelected(preferred ?? nextBanks[0] ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load bank destinations.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, [localUserId, desiredLabel]);

  const visibleBanks = useMemo(() => banks.slice(0, 12), [banks]);

  const verify = async () => {
    if (!selected || accountNumber.length !== 10) {
      setError("Choose a bank and enter the exact 10-digit Nigerian account number.");
      return;
    }
    setBusy(true);
    setError(null);
    setVerifiedName(null);
    try {
      const result = await verifyNigerianBankAccount(localUserId, selected.code, accountNumber);
      setVerifiedName(result.accountHolderName);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!selected || !verifiedName || !label.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const destination = await registerNigerianBankAccount({
        localUserId,
        label: label.trim(),
        bankCode: selected.code,
        bankName: selected.name,
        accountNumber,
        accountHolderName: verifiedName
      });
      setSavedDestination(destination);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save withdrawal destination.");
    } finally {
      setBusy(false);
    }
  };

  const returnToGuard = () => {
    if (planId) {
      router.replace({ pathname: "/operator/guard", params: { localUserId, planId } });
      return;
    }
    router.replace({ pathname: "/(tabs)/home", params: { localUserId } });
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.providerRow}>
        <FlowHeader
          eyebrow="NIGERIAN BANK DESTINATION"
          title={savedDestination ? "Destination verified." : "Verify where your money is allowed to go."}
          description={savedDestination
            ? "MONIFlow found the persisted verified destination required by this plan."
            : "The active provider verifies the account holder before MONIFlow saves the destination for MONI Guard."}
        />
        <StatusPill label={providerBadge(provider)} tone={provider?.simulated ? "processing" : "success"} />
      </View>

      {savedDestination ? (
        <SoftCard style={styles.readyCard}>
          <StatusPill label="DESTINATION READY" tone="success" />
          <Text style={styles.bankName}>{savedDestination.bankName}</Text>
          <Text style={styles.account}>{savedDestination.maskedAccountNumber}</Text>
          <Text style={styles.holder}>{savedDestination.accountHolderName}</Text>
          <Text style={styles.micro}>Saved as “{savedDestination.label}” · verified by {providerName(provider)}.</Text>
          <PrimaryButton onPress={returnToGuard}>{planId ? "Return to MONI Guard" : "Return Home"}</PrimaryButton>
        </SoftCard>
      ) : (
        <>
          <SoftCard style={styles.card}>
            <Text style={styles.label}>BANK</Text>
            {busy && banks.length === 0 ? <Text style={styles.copy}>Loading supported banks…</Text> : null}
            <View style={styles.bankList}>
              {visibleBanks.map((bank) => (
                <Pressable
                  key={`${bank.code}-${bank.name}`}
                  onPress={() => { setSelected(bank); setVerifiedName(null); }}
                  style={[styles.bankChip, selected?.code === bank.code && styles.bankChipSelected]}
                >
                  <Text style={[styles.bankChipText, selected?.code === bank.code && styles.bankChipTextSelected]}>{bank.name}</Text>
                  <Text style={styles.bankCode}>{bank.code}</Text>
                </Pressable>
              ))}
            </View>
          </SoftCard>

          <SoftCard style={styles.card}>
            <Text style={styles.label}>ACCOUNT NUMBER</Text>
            <TextInput
              keyboardType="number-pad"
              maxLength={10}
              onChangeText={(value) => { setAccountNumber(value.replace(/\D/g, "")); setVerifiedName(null); }}
              placeholder="10-digit account"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={accountNumber}
            />
            <Text style={styles.label}>SAVE AS</Text>
            <TextInput
              onChangeText={setLabel}
              placeholder="GTBank"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={label}
            />
            <PrimaryButton disabled={busy || !selected || accountNumber.length !== 10} onPress={() => void verify()}>
              {busy ? "Checking…" : `Verify with ${providerName(provider)}`}
            </PrimaryButton>
          </SoftCard>

          {verifiedName ? (
            <View style={styles.verifiedCard}>
              <StatusPill label="VERIFIED" tone="success" />
              <Text style={styles.bankName}>{selected?.name}</Text>
              <Text style={styles.account}>•••• {accountNumber.slice(-4)}</Text>
              <Text style={styles.holder}>{verifiedName}</Text>
              <PrimaryButton disabled={busy || !label.trim()} onPress={() => void save()}>
                Save verified destination
              </PrimaryButton>
            </View>
          ) : null}
        </>
      )}

      {error ? (
        <SoftCard style={styles.card}>
          <StatusPill label="BANK FLOW BLOCKED" tone="warning" />
          <Text style={styles.error}>{error}</Text>
          <SecondaryButton disabled={busy} onPress={() => void load()}>Retry</SecondaryButton>
        </SoftCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  providerRow: { gap: spacing.md },
  card: { gap: spacing.md },
  readyCard: { gap: spacing.md },
  label: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.2 },
  input: { ...typography.heading, backgroundColor: colors.backgroundPrimary, borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  bankList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  bankChip: { borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, gap: 2, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bankChipSelected: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  bankChipText: { ...typography.caption, color: colors.textPrimary, maxWidth: 170 },
  bankChipTextSelected: { color: colors.textInverse },
  bankCode: { ...typography.technical, color: colors.textSecondary },
  verifiedCard: { backgroundColor: colors.surfaceStrong, borderRadius: radius.card, gap: spacing.sm, padding: spacing.xl },
  bankName: { ...typography.heading, color: colors.textPrimary },
  account: { ...typography.section, color: colors.textPrimary },
  holder: { ...typography.body, color: colors.textSecondary, fontWeight: "600" },
  micro: { ...typography.technical, color: colors.textSecondary },
  copy: { ...typography.body, color: colors.textSecondary },
  error: { ...typography.body, color: colors.statusError }
});
