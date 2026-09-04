import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, StatusPill } from "@/components/ui";
import { mockDisclosure } from "@/constants/mockData";
import { colors, radius, spacing, typography } from "@/theme";

const banks = [
  { account: "•••• 0194", name: "GTBank" },
  { account: "•••• 6821", name: "Access Bank" }
] as const;

export default function BankSelectScreen() {
  const [selected, setSelected] = useState("GTBank");

  return (
    <Screen contentContainerStyle={styles.screen} scroll={false}>
      <View style={styles.content}>
        <FlowHeader
          description="Choose an example destination for this static withdrawal journey."
          eyebrow="BANK PREVIEW · 01"
          title="Where should it go?"
        />
        <View style={styles.list}>
          {banks.map((bank) => {
            const active = bank.name === selected;
            return (
              <Pressable
                accessibilityRole="button"
                key={bank.name}
                onPress={() => setSelected(bank.name)}
                style={({ pressed }) => [styles.bank, active && styles.bankActive, pressed && styles.pressed]}
              >
                <View style={styles.bankCopy}>
                  <Text style={styles.bankName}>{bank.name}</Text>
                  <Text style={styles.bankAccount}>EXAMPLE ACCOUNT · {bank.account}</Text>
                </View>
                <StatusPill label={active ? "SELECTED" : "PREVIEW"} tone={active ? "processing" : "warning"} />
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.actions}>
        <PrimaryButton onPress={() => router.push("/bank/verify")}>Review destination</PrimaryButton>
        <Text style={styles.disclosure}>{mockDisclosure}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, justifyContent: "space-between", paddingBottom: spacing.xxl },
  content: { gap: spacing.xxxl },
  list: { gap: spacing.sm },
  bank: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 88,
    padding: spacing.lg
  },
  bankActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentPrimary },
  bankCopy: { flex: 1, gap: spacing.xs },
  bankName: { ...typography.section, color: colors.textPrimary },
  bankAccount: { ...typography.technical, color: colors.textSecondary, fontSize: 9 },
  actions: { gap: spacing.sm },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" },
  pressed: { opacity: 0.72 }
});
