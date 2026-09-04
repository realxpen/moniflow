import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedEntry } from "@/components/ui/AnimatedEntry";
import { MoneyText } from "@/components/ui/MoneyText";
import { StatusPill } from "@/components/ui/StatusPill";
import { colors, radius, shadows, spacing, typography } from "@/theme";

type BalanceCardProps = {
  actions?: ReactNode;
  amount: number;
  label?: string;
  mock?: boolean;
};

export function BalanceCard({
  actions,
  amount,
  label = "Available balance",
  mock = false
}: BalanceCardProps) {
  return (
    <AnimatedEntry>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.label}>{label}</Text>
          <StatusPill label={mock ? "MOCK DATA" : "CNGN"} tone={mock ? "warning" : "success"} />
        </View>
        <MoneyText amount={amount} style={styles.amount} />
        <Text style={styles.meta}>
          {mock ? "Design-system preview only" : "Provider-verified balance"}
        </Text>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </AnimatedEntry>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
    ...shadows.soft
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  label: { ...typography.technical, color: colors.textSecondary },
  amount: { fontSize: 42, lineHeight: 48 },
  meta: { ...typography.caption, color: colors.textSecondary },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }
});
