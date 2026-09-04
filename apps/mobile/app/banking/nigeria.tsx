import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import {
  getNigerianBanks,
  registerNigerianBankAccount,
  verifyNigerianBankAccount,
  type NigerianBank
} from "@/services/banking";
import { colors, radius, spacing, typography } from "@/theme";

export default function NigerianBankScreen() {
  const params = useLocalSearchParams<{ localUserId?: string; planId?: string; desiredLabel?: string }>();
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const planId = typeof params.planId === "string" ? params.planId : "";
  const desiredLabel = typeof params.desiredLabel === "string" && params.desiredLabel.trim() ? params.desiredLabel.trim() : "GTBank";
  const [banks, setBanks] = useState<NigerianBank[]>([]);
  const [selected, setSelected] = useState<NigerianBank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [label, setLabel] = useState(desiredLabel);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!localUserId) return;
      setBusy(true);
      try {
        const next = await getNigerianBanks(localUserId);
        if (!active) return;
        setBanks(next);
        const preferred = next.find((bank) => bank.name.toLowerCase().includes("guaranty trust") || bank.name.toLowerCase().includes("gtbank"));
        setSelected(preferred ?? next[0] ?? null);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load banks.");
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => { active = false; };
  }, [localUserId]);

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
    if (!selected || !verifiedName) return;
    setBusy(true);
    setError(null);
    try {
      await registerNigerianBankAccount({
        localUserId,
        label,
        bankCode: selected.code,
        bankName: selected.name,
        accountNumber,
        accountHolderName: verifiedName
      });
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save withdrawal destination.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <FlowHeader
        eyebrow="NIGERIAN BANK DESTINATION"
        title="Verify where your money is allowed to go."
        description="MONIFlow reads the supported bank list from BMONI, verifies the account holder, then registers the exact withdrawal account with BMONI before MONI Guard can approve a bank withdrawal."
      />

      <SoftCard style={styles.card}>
        <Text style={styles.label}>BANK</Text>
        <View style={styles.bankList}>
          {visibleBanks.map((bank) => (
            <Pressable
              key={`${bank.code}-${bank.name}`}
              onPress={() => { setSelected(bank); setVerifiedName(null); setSaved(false); }}
              style={[styles.bankChip, selected?.code === bank.code && styles.bankChipSelected]}
            >
              <Text style={[styles.bankChipText, selected?.code === bank.code && styles.bankChipTextSelected]}>{bank.name}</Text>
              <Text style={styles.bankCode}>{bank.code}</Text>
            </Pressable>
          ))}
        </View>
        {banks.length > visibleBanks.length ? <Text style={styles.micro}>Showing the first 12 provider banks. GTBank is preselected when BMONI returns it.</Text> : null}
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.label}>ACCOUNT NUMBER</Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={10}
          onChangeText={(value) => { setAccountNumber(value.replace(/\D/g, "")); setVerifiedName(null); setSaved(false); }}
          placeholder="0123456789"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={accountNumber}
        />
        <Text style={styles.label}>SAVE AS</Text>
        <TextInput
          onChangeText={(value) => { setLabel(value); setSaved(false); }}
          placeholder="GTBank"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={label}
        />
        <PrimaryButton disabled={busy || !selected || accountNumber.length !== 10} onPress={() => void verify()}>
          Verify account with BMONI
        </PrimaryButton>
      </SoftCard>

      {verifiedName ? (
        <View style={styles.verifiedCard}>
          <StatusPill label="VERIFIED BY BMONI" tone="success" />
          <Text style={styles.bankName}>{selected?.name}</Text>
          <Text style={styles.account}>•••• {accountNumber.slice(-4)}</Text>
          <Text style={styles.holder}>{verifiedName}</Text>
          <Text style={styles.micro}>Registration will re-run verification server-side and require this exact holder name before saving.</Text>
          <PrimaryButton disabled={busy || !label.trim()} onPress={() => void save()}>
            Save verified destination
          </PrimaryButton>
        </View>
      ) : null}

      {saved ? (
        <SoftCard style={styles.card}>
          <StatusPill label="DESTINATION READY" tone="success" />
          <Text style={styles.copy}>The BMONI withdrawal-account id is now mapped to “{label}”. Re-run MONI Guard so the plan can reach human approval.</Text>
          <PrimaryButton
            onPress={() => planId ? router.replace({ pathname: "/operator/guard", params: { localUserId, planId } }) : router.back()}
          >
            Return to MONI Guard
          </PrimaryButton>
        </SoftCard>
      ) : null}

      {error ? (
        <SoftCard style={styles.card}>
          <StatusPill label="BANK FLOW BLOCKED" tone="warning" />
          <Text style={styles.error}>{error}</Text>
        </SoftCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  card: { gap: spacing.md },
  label: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.2 },
  input: { ...typography.heading, backgroundColor: colors.backgroundPrimary, borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  bankList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  bankChip: { borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, gap: 2, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bankChipSelected: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  bankChipText: { ...typography.caption, color: colors.textPrimary, maxWidth: 170 },
  bankChipTextSelected: { color: colors.textInverse },
  bankCode: { ...typography.technical, color: colors.textSecondary },
  verifiedCard: { backgroundColor: colors.surfaceStrong, borderRadius: radius.card, gap: spacing.sm, padding: spacing.xl },
  bankName: { ...typography.heading, color: colors.textInverse },
  account: { ...typography.section, color: colors.textInverse },
  holder: { ...typography.body, color: colors.accentSoft, fontWeight: "600" },
  micro: { ...typography.technical, color: colors.textSecondary },
  copy: { ...typography.body, color: colors.textSecondary },
  error: { ...typography.body, color: colors.statusError }
});
