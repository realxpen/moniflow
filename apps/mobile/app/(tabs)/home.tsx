import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  GlassCard,
  MoneyText,
  Pill,
  Screen,
  SectionTitle,
  SoftCard,
  StatusPill
} from "@/components/ui";
import { colors, radius, spacing, typography } from "@/theme";

const quickActions = ["Withdraw", "Save", "Activity"] as const;
const suggestions = [
  "Show my available balance",
  "Create a laptop pocket",
  "Show my recent activity"
] as const;

export default function HomeScreen() {
  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good afternoon</Text>
          <Text style={styles.name}>Ayomide</Text>
        </View>
        <StatusPill label="SANDBOX UI" tone="processing" />
      </View>

      <SoftCard style={styles.balanceCard}>
        <Text style={styles.technicalLabel}>AVAILABLE BALANCE · MOCK DATA</Text>
        <MoneyText amount={128_450} />
        <Text style={styles.balanceNote}>Placeholder only — not retrieved from BMONI.</Text>
      </SoftCard>

      <View style={styles.quickActions}>
        {quickActions.map((action) => (
          <Pressable key={action} style={styles.quickAction}>
            <Text style={styles.quickActionLabel}>{action}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="INTELLIGENCE MODE" title="What should your money do?" />
        <GlassCard style={styles.operatorCard}>
          <Text style={styles.operatorPrompt}>
            Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/operator/processing")}
            style={styles.operatorButton}
          >
            <Text style={styles.operatorButtonLabel}>Preview flow</Text>
          </Pressable>
        </GlassCard>
        <View style={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <Pill key={suggestion}>{suggestion}</Pill>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="MONEY POCKETS" title="Give every naira a purpose" />
        <View style={styles.twoColumn}>
          <SoftCard style={styles.smallCard}>
            <Text style={styles.cardLabel}>Laptop</Text>
            <Text style={styles.cardValue}>₦20,000</Text>
            <Text style={styles.cardMeta}>Mock allocation</Text>
          </SoftCard>
          <SoftCard style={styles.smallCard}>
            <Text style={styles.cardLabel}>Emergency</Text>
            <Text style={styles.cardValue}>₦8,000</Text>
            <Text style={styles.cardMeta}>Mock allocation</Text>
          </SoftCard>
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="ACTIVITY" title="Recent movement" />
        <SoftCard style={styles.activityCard}>
          <View>
            <Text style={styles.cardLabel}>Phase 1 preview</Text>
            <Text style={styles.cardMeta}>No provider activity is connected.</Text>
          </View>
          <StatusPill label="NOT LIVE" tone="warning" />
        </SoftCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.xxl,
    paddingBottom: spacing.giant
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  greeting: {
    ...typography.caption,
    color: colors.textSecondary
  },
  name: {
    ...typography.heading,
    color: colors.textPrimary
  },
  balanceCard: {
    gap: spacing.sm
  },
  technicalLabel: {
    ...typography.technical,
    color: colors.textSecondary
  },
  balanceNote: {
    ...typography.caption,
    color: colors.textSecondary
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  quickActionLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "600"
  },
  section: {
    gap: spacing.md
  },
  operatorCard: {
    backgroundColor: colors.accentSoft
  },
  operatorPrompt: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 25,
    lineHeight: 32
  },
  operatorButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.textPrimary,
    borderRadius: radius.pill,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  operatorButtonLabel: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: "600"
  },
  suggestions: {
    alignItems: "flex-start",
    gap: spacing.xs
  },
  twoColumn: {
    flexDirection: "row",
    gap: spacing.sm
  },
  smallCard: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.lg
  },
  cardLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600"
  },
  cardValue: {
    ...typography.section,
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"]
  },
  cardMeta: {
    ...typography.caption,
    color: colors.textSecondary
  },
  activityCard: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg
  }
});
