import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import {
  applyPracticeAction, initialPracticeLedger, practicePockets, practiceSummary,
  type PracticeAction, type PracticeLedger, type PracticePocket
} from "@/services/offline-pocket-ledger";
import { colors, layout, radius, spacing, typography } from "@/theme";

const naira = (value: number) => "₦" + value.toLocaleString("en-NG");

/**
 * Temporary educational ledger. All balances and records are React memory only.
 * It deliberately cannot query/mutate an authenticated MONIFlow account.
 */
export default function PocketActivityPracticeScreen() {
  const ledgerRef = useRef<PracticeLedger>(initialPracticeLedger());
  const [ledger, setLedger] = useState<PracticeLedger>(() => ledgerRef.current);
  const [pocket, setPocket] = useState<PracticePocket>("Laptop");
  const [amount, setAmount] = useState("20000");
  const [status, setStatus] = useState<"SIMULATED" | "BLOCKED" | "RESET" | "IDLE">("IDLE");
  const [message, setMessage] = useState("Try an internal Pocket allocation or a hypothetical GTBank withdrawal.");
  const summary = practiceSummary(ledger);

  const act = (action: PracticeAction) => {
    const outcome = applyPracticeAction(ledgerRef.current, action);
    ledgerRef.current = outcome.ledger;
    setLedger(outcome.ledger);
    setStatus(outcome.status);
    setMessage(outcome.explanation);
  };

  return (
    <Screen contentContainerStyle={styles.page}>
      <View style={styles.section}>
        <Text style={styles.eyebrow}>LEARNING MODE · PRACTICE MONEY SPACES</Text>
        <Text style={styles.title}>Move example money. See what changes.</Text>
        <Text style={styles.copy}>
          Try Pockets, releases and a hypothetical bank withdrawal with a fixed example amount.
          Nothing connects to a BMONI wallet, or changes your actual MONIFlow account.
        </Text>
        <StatusPill label="OFFLINE · LOCAL MEMORY ONLY · NO REAL FUNDS" tone="warning" />
      </View>

      <SoftCard style={styles.card}>
        <Text style={styles.label}>FIXED PRACTICE OPENING BALANCE · ₦300,000</Text>
        <MoneyRow label="Hypothetical provider balance" value={naira(summary.providerBalance)} />
        <MoneyRow label="Allocated inside practice Pockets" value={naira(summary.allocated)} />
        <View style={styles.divider} />
        <MoneyRow label="Hypothetical available to spend" value={naira(summary.available)} strong />
        <Text style={styles.copy}>
          Only a simulated external withdrawal reduces the provider-balance illustration.
          Pocket allocations are internal reservations, not separate accounts or provider deposits.
        </Text>
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.label}>PRACTICE POCKETS</Text>
        {practicePockets.map(name => (
          <View key={name} style={styles.pocketRow}>
            <Text style={styles.pocketName}>{name}</Text>
            <Text style={styles.pocketValue}>{naira(ledger.allocated[name])}</Text>
          </View>
        ))}
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.label}>CHOOSE A PRACTICE POCKET</Text>
        <View style={styles.pocketChoices}>
          {practicePockets.map(name => (
            <Pressable key={name} accessibilityRole="button"
              accessibilityState={{ selected: pocket === name }}
              onPress={() => { setPocket(name); setStatus("IDLE"); }}
              style={[styles.choice, pocket === name && styles.chosen]}>
              <Text style={[styles.choiceText, pocket === name && styles.chosenText]}>{name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>WHOLE-NAIRA EXAMPLE AMOUNT</Text>
        <TextInput
          accessibilityLabel="Practice amount in whole naira"
          keyboardType="numeric" maxLength={10} selectTextOnFocus
          value={amount} onChangeText={(next) => { setAmount(next); setStatus("IDLE"); }}
          placeholder="20000" placeholderTextColor={colors.textSecondary}
          style={styles.input}
        />
        <Text style={styles.helper}>Digits only, without ₦, commas or decimals. Use fictional amounts only.</Text>

        <PrimaryButton onPress={() => act({ type: "ALLOCATE", pocket, amountText: amount })}>
          Simulate Pocket allocation
        </PrimaryButton>
        <SecondaryButton onPress={() => act({ type: "RELEASE", pocket, amountText: amount })}>
          Release example allocation
        </SecondaryButton>
        <SecondaryButton onPress={() => act({ type: "WITHDRAW", amountText: amount })}>
          Simulate GTBank withdrawal · no bank transfer
        </SecondaryButton>

        <Text accessibilityRole="text" style={[styles.notice, status === "BLOCKED" && styles.warning]}>
          {status === "BLOCKED" ? "EXAMPLE BLOCKED · " : ""}{message}
        </Text>
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.label}>TEMPORARY PRACTICE ACTIVITY</Text>
        {ledger.entries.length === 0 ? (
          <Text style={styles.copy}>No practice events yet. Try an example action above.</Text>
        ) : ledger.entries.map(entry => (
          <View key={entry.id} style={styles.activityRow}>
            <View style={styles.activityCopy}>
              <Text style={styles.pocketName}>{entry.label}</Text>
              <Text style={styles.helper}>SIMULATED ONLY · NOT SAVED · EVENT {entry.id}</Text>
            </View>
            <Text style={styles.pocketValue}>{entry.kind === "SIMULATED_RELEASE" ? "+" : "−"}{naira(entry.amount)}</Text>
          </View>
        ))}
        <Text style={styles.disclosure}>
          No real Financial Memory, bank verification, provider receipt, KYC, wallet signing or transaction exists here.
          History disappears when this screen is closed or the example is reset.
        </Text>
        <SecondaryButton onPress={() => { act({ type: "RESET" }); setAmount("20000"); setPocket("Laptop"); }}>
          Reset example money, Pockets and activity
        </SecondaryButton>
      </SoftCard>

      <PrimaryButton onPress={() => router.replace("/learn")}>
        Return to Learning & Practice
      </PrimaryButton>
    </Screen>
  );
}

function MoneyRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.moneyRow}>
      <Text style={styles.moneyLabel}>{label}</Text>
      <Text style={[styles.moneyValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.xl, paddingTop: spacing.xl, paddingBottom: layout.tabContentBottomInset },
  section: { gap: spacing.md },
  eyebrow: { ...typography.technical, color: colors.statusProcessing },
  title: { ...typography.display, color: colors.textPrimary },
  copy: { ...typography.body, color: colors.textSecondary },
  card: { gap: spacing.md },
  label: { ...typography.technical, color: colors.statusProcessing },
  moneyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  moneyLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  moneyValue: { ...typography.section, color: colors.textPrimary, flexShrink: 1, textAlign: "right" },
  strong: { color: colors.statusSuccess, fontWeight: "700" },
  divider: { height: 1, backgroundColor: colors.borderSoft },
  pocketRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md,
    borderBottomWidth: 1, borderColor: colors.borderSoft, paddingVertical: spacing.sm },
  pocketName: { ...typography.body, color: colors.textPrimary, flex: 1 },
  pocketValue: { ...typography.section, color: colors.textPrimary, flexShrink: 1, textAlign: "right" },
  pocketChoices: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderSoft,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md, minHeight: 44,
    backgroundColor: colors.backgroundPrimary, justifyContent: "center" },
  chosen: { backgroundColor: colors.accentSoft, borderColor: colors.accentPrimary },
  choiceText: { ...typography.caption, color: colors.textSecondary },
  chosenText: { color: colors.textPrimary, fontWeight: "700" },
  input: { ...typography.section, color: colors.textPrimary, backgroundColor: colors.backgroundPrimary,
    minHeight: 52, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.lg,
    paddingHorizontal: spacing.md },
  helper: { ...typography.caption, color: colors.textSecondary },
  notice: { ...typography.body, color: colors.statusSuccess },
  warning: { color: colors.statusWarning },
  activityRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md,
    borderBottomWidth: 1, borderColor: colors.borderSoft, paddingVertical: spacing.md },
  activityCopy: { flex: 1, gap: spacing.xs },
  disclosure: { ...typography.technical, color: colors.statusWarning }
});
