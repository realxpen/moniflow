import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import {
  evaluatePlayground, playgroundOpeningBalance, playgroundPresets
} from "@/services/money-plan-playground";
import { colors, layout, radius, spacing, typography } from "@/theme";

const formatNaira = (value: number) => "₦" + value.toLocaleString("en-NG");

/**
 * Local what-if calculator only. It must never take a personal account ID,
 * call an operator endpoint or treat mathematical validation as MONI Guard.
 */
export default function MoneyPlanPlaygroundScreen() {
  const [withdrawal, setWithdrawal] = useState<string>("40000");
  const [allocation, setAllocation] = useState<string>("20000");
  const result = evaluatePlayground(withdrawal, allocation);
  const valid = result.status === "MATH_PREVIEW";

  const applyPreset = (preset: typeof playgroundPresets[number]) => {
    setWithdrawal(preset.withdrawal);
    setAllocation(preset.allocation);
  };

  return (
    <Screen contentContainerStyle={styles.page}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>LEARNING MODE · MONEY PLAN LAB</Text>
        <Text style={styles.title}>What if you moved your money differently?</Text>
        <Text style={styles.copy}>
          Adjust two hypothetical amounts to see the effect on an example ₦300,000 balance.
          This is a local mathematics exercise, never your account balance.
        </Text>
        <StatusPill label="OFFLINE NUMBERS · NO REAL FUNDS" tone="warning" />
      </View>

      <SoftCard style={styles.card}>
        <Text style={styles.label}>STARTING EXAMPLE</Text>
        <Text style={styles.balance}>{formatNaira(playgroundOpeningBalance)}</Text>
        <Text style={styles.copy}>
          A fixed illustration, not a wallet lookup. No personal or banking information is used.
        </Text>
        <Text style={styles.label}>TRY A SCENARIO</Text>
        <View style={styles.presetGroup}>
          {playgroundPresets.map(preset => {
            const active = preset.withdrawal === withdrawal && preset.allocation === allocation;
            return (
              <Pressable key={preset.id} accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => applyPreset(preset)}
                style={[styles.preset, active && styles.presetActive]}>
                <Text style={[styles.presetText, active && styles.presetTextActive]}>{preset.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.label}>YOUR HYPOTHETICAL MONEY PLAN</Text>
        <View style={styles.field}>
          <Text style={styles.fieldTitle}>GTBank withdrawal · external example</Text>
          <Text style={styles.copy}>Amount in whole naira. Bank account ownership is not verified.</Text>
          <TextInput accessibilityLabel="Example withdrawal amount in naira"
            keyboardType="numeric" maxLength={10} selectTextOnFocus
            value={withdrawal} onChangeText={setWithdrawal}
            placeholder="40000" placeholderTextColor={colors.textSecondary}
            style={styles.input} />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldTitle}>Laptop Money Space · internal allocation</Text>
          <Text style={styles.copy}>A bookkeeping reservation, not a transfer to a second provider wallet.</Text>
          <TextInput accessibilityLabel="Example Laptop pocket allocation in naira"
            keyboardType="numeric" maxLength={10} selectTextOnFocus
            value={allocation} onChangeText={setAllocation}
            placeholder="20000" placeholderTextColor={colors.textSecondary}
            style={styles.input} />
        </View>
        <Text style={styles.helper}>Enter digits only, without ₦, commas or decimals. Enter 0 to skip either action.</Text>
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.label}>ILLUSTRATIVE PLAN CHECKS</Text>
        <StatusPill label={valid ? "MATH PREVIEW · NOT APPROVED" : "EXAMPLE BLOCKED"}
          tone={valid ? "processing" : "warning"} />
        {result.checks.map(check => (
          <View style={styles.check} key={check.id}>
            <Text style={styles.checkTitle}>
              {check.passed ? "MATH OK" : "NOT VERIFIED / BLOCKED"} · {check.label}
            </Text>
            <Text style={styles.copy}>{check.detail}</Text>
          </View>
        ))}
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.label}>WHAT THE EXAMPLE WOULD SHOW</Text>
        {valid && result.providerAfter !== null && result.availableAfter !== null &&
          result.withdrawal !== null && result.allocation !== null ? (
          <>
            <MoneyRow label="Illustrative starting funds" amount={formatNaira(result.openingBalance)} />
            <MoneyRow label="Example external withdrawal" amount={"−" + formatNaira(result.withdrawal)} />
            <MoneyRow label="Hypothetical provider balance" amount={formatNaira(result.providerAfter)} />
            <MoneyRow label="Laptop bookkeeping allocation" amount={"−" + formatNaira(result.allocation)} />
            <View style={styles.divider} />
            <MoneyRow label="Illustrative available to spend" amount={formatNaira(result.availableAfter)} strong />
            <Text style={styles.copy}>
              The provider balance illustration changes only for the external withdrawal.
              Internal allocations reduce the example spendable amount, not provider-held funds.
            </Text>
          </>
        ) : (
          <Text style={styles.blocked}>
            No hypothetical resulting balance is shown. Correct the invalid or overspending amounts first.
          </Text>
        )}
        <Text style={styles.disclosure}>
          NOT A MONI GUARD ALLOW VERDICT · BANK NOT VERIFIED · NO HUMAN FINANCIAL APPROVAL · NO BMONI ACTION
        </Text>
      </SoftCard>

      <PrimaryButton onPress={() => router.replace("/learn")}>Return to Learning & Practice</PrimaryButton>
    </Screen>
  );
}

function MoneyRow({ label, amount, strong = false }: { label: string; amount: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowAmount, strong && styles.highlight]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.xl, paddingTop: spacing.xl, paddingBottom: layout.tabContentBottomInset },
  heading: { gap: spacing.md },
  eyebrow: { ...typography.technical, color: colors.statusProcessing },
  title: { ...typography.display, color: colors.textPrimary },
  copy: { ...typography.body, color: colors.textSecondary },
  label: { ...typography.technical, color: colors.statusProcessing },
  card: { gap: spacing.md },
  balance: { ...typography.display, color: colors.textPrimary },
  presetGroup: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  preset: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.pill,
    backgroundColor: colors.backgroundPrimary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  presetActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentPrimary },
  presetText: { ...typography.caption, color: colors.textSecondary },
  presetTextActive: { color: colors.textPrimary, fontWeight: "700" },
  field: { gap: spacing.sm },
  fieldTitle: { ...typography.body, color: colors.textPrimary, fontWeight: "700" },
  input: { ...typography.section, backgroundColor: colors.backgroundPrimary, color: colors.textPrimary,
    minHeight: 52, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.lg, paddingHorizontal: spacing.md },
  helper: { ...typography.caption, color: colors.textSecondary },
  check: { gap: spacing.xs, paddingVertical: spacing.xs },
  checkTitle: { ...typography.caption, fontWeight: "700", color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.borderSoft },
  row: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between", alignItems: "center" },
  rowLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  rowAmount: { ...typography.section, color: colors.textPrimary, flexShrink: 1, textAlign: "right" },
  highlight: { color: colors.statusSuccess, fontWeight: "700" },
  blocked: { ...typography.body, color: colors.statusWarning },
  disclosure: { ...typography.technical, color: colors.statusWarning }
});
