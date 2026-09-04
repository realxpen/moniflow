import { router } from "expo-router";
import { useMemo, useState } from "react";
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
  StatusPill,
  SuggestionChip
} from "@/components/ui";
import { mockDisclosure, mockHomeData } from "@/constants/mockData";
import { colors, layout, spacing, typography } from "@/theme";

export default function HomeScreen() {
  const [command, setCommand] = useState("");
  const [showAddMoney, setShowAddMoney] = useState(false);
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{mockHomeData.firstName}</Text>
        </View>
        <StatusPill label="SANDBOX UI" tone="processing" />
      </View>

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
        amount={mockHomeData.availableBalance}
        label="AVAILABLE"
        mock
      />

      <View style={styles.section}>
        <SectionTitle eyebrow="MONIFLOW OPERATOR" title="What should your money do?" />
        <OperatorInput
          actionLabel="Preview plan"
          onChangeText={setCommand}
          onSubmit={() => router.push("/operator/processing")}
          placeholder="Ask MONIFlow..."
          value={command}
        />
        <View style={styles.suggestions}>
          <Text style={styles.technicalLabel}>SUGGESTED</Text>
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
            <Text style={styles.demoCommand}>Use the full demo instruction</Text>
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
        <Text style={styles.sheetCopy}>
          This static shell reserves the add-money entry point. No virtual account or BMONI
          funding action is connected in Phase 3.
        </Text>
        <PrimaryButton onPress={() => setShowAddMoney(false)}>Got it</PrimaryButton>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxxl, paddingBottom: layout.tabContentBottomInset, paddingTop: spacing.xl },
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  greetingBlock: { gap: spacing.xxs },
  greeting: { ...typography.caption, color: colors.textSecondary },
  name: { ...typography.heading, color: colors.textPrimary },
  balanceAction: { flex: 1, minWidth: 0 },
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
  pressed: { opacity: 0.65 }
});
