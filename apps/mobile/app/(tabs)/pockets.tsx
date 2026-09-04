import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PocketCard } from "@/components/pockets";
import {
  BottomSheet,
  PrimaryButton,
  Screen,
  SectionTitle,
  StatusPill
} from "@/components/ui";
import { mockDisclosure, mockHomeData } from "@/constants/mockData";
import { colors, layout, radius, spacing, typography } from "@/theme";

export default function PocketsScreen() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>CALM MODE</Text>
          <Text style={styles.title}>Money spaces</Text>
          <Text style={styles.description}>
            Simple internal allocations that give your money a purpose.
          </Text>
        </View>
        <StatusPill label="MOCK DATA" tone="warning" />
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>ASSIGNED ACROSS SPACES</Text>
        <Text style={styles.summaryValue}>₦80,000</Text>
        <Text style={styles.summaryMeta}>No provider-held partitions are represented.</Text>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="YOUR SPACES" title="Purpose, made visible" />
        {mockHomeData.pockets.map((pocket) => (
          <PocketCard key={pocket.name} {...pocket} />
        ))}
      </View>

      <PrimaryButton onPress={() => setShowCreate(true)}>Create a money space</PrimaryButton>
      <Text style={styles.disclosure}>{mockDisclosure}</Text>

      <BottomSheet onClose={() => setShowCreate(false)} title="Create a money space" visible={showCreate}>
        <Text style={styles.sheetCopy}>
          Creation and persistence arrive in Phase 14. This interaction only demonstrates the
          planned shell.
        </Text>
        <PrimaryButton onPress={() => setShowCreate(false)}>Close preview</PrimaryButton>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxxl, paddingBottom: layout.tabContentBottomInset, paddingTop: spacing.xl },
  header: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  copy: { flex: 1, gap: spacing.xs },
  eyebrow: { ...typography.technical, color: colors.textSecondary },
  title: { ...typography.display, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary },
  summary: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.card,
    gap: spacing.xs,
    padding: spacing.xl
  },
  summaryLabel: { ...typography.technical, color: colors.statusProcessing },
  summaryValue: { ...typography.display, color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  summaryMeta: { ...typography.caption, color: colors.textSecondary },
  section: { gap: spacing.md },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" },
  sheetCopy: { ...typography.body, color: colors.textSecondary }
});
