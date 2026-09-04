import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ActivityRow } from "@/components/activity";
import { BalanceCard } from "@/components/balance";
import { GuardCheck } from "@/components/guard";
import { ProgressStep } from "@/components/operator";
import { PocketCard } from "@/components/pockets";
import {
  AnimatedEntry,
  BottomSheet,
  ConfirmationButton,
  GlassCard,
  MoneyText,
  OperatorInput,
  Pill,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionTitle,
  SoftCard,
  StatusPill,
  SuggestionChip
} from "@/components/ui";
import { colors, radius, spacing, typography } from "@/theme";

const tokenSwatches = [
  ["IVORY", colors.backgroundPrimary],
  ["LAVENDER", colors.backgroundSecondary],
  ["CHARCOAL", colors.textPrimary],
  ["POSITIVE", colors.statusSuccess],
  ["WARNING", colors.statusWarning],
  ["CRITICAL", colors.statusError]
] as const;

const suggestions = ["Save ₦20k", "Withdraw ₦40k", "Organize my income"] as const;

export default function DesignSystemScreen() {
  const [command, setCommand] = useState(
    "Withdraw ₦40,000 to GTBank and save ₦20,000 for my laptop."
  );
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>(suggestions[0]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Screen contentContainerStyle={styles.screen} scrollProps={{ testID: "design-system-showcase" }}>
      <AnimatedEntry>
        <View style={styles.hero}>
          <Pill>INTERNAL PREVIEW · PHASE 2</Pill>
          <Text style={styles.heroTitle}>Calm financial intelligence.</Text>
          <Text style={styles.heroBody}>
            A coherent visual language for plans, safety, and human-controlled money.
          </Text>
        </View>
      </AnimatedEntry>

      <View style={styles.section}>
        <SectionTitle eyebrow="FOUNDATIONS" title="Color and type" />
        <View style={styles.swatchGrid}>
          {tokenSwatches.map(([label, color]) => (
            <View key={label} style={styles.swatchItem}>
              <View style={[styles.swatch, { backgroundColor: color }]} />
              <Text style={styles.swatchLabel}>{label}</Text>
            </View>
          ))}
        </View>
        <SoftCard style={styles.typeCard}>
          <Text style={styles.technicalSample}>MONI GUARD · CNGN · PROCESSING</Text>
          <MoneyText amount={300_000} />
          <Text style={styles.editorialSample}>Money, operated intelligently.</Text>
        </SoftCard>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="CALM MODE" title="Balance and actions" />
        <BalanceCard
          actions={
            <>
              <PrimaryButton style={styles.flexButton}>Add money</PrimaryButton>
              <SecondaryButton style={styles.flexButton}>Withdraw</SecondaryButton>
            </>
          }
          amount={300_000}
          mock
        />
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="INTELLIGENCE MODE" title="Operator" />
        <OperatorInput
          onChangeText={setCommand}
          onSubmit={() => setSheetVisible(true)}
          value={command}
        />
        <View style={styles.chips}>
          {suggestions.map((suggestion) => (
            <SuggestionChip
              key={suggestion}
              label={suggestion}
              onPress={() => {
                setSelectedSuggestion(suggestion);
                setCommand(suggestion);
              }}
              selected={selectedSuggestion === suggestion}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="SURFACES" title="Soft and selective glass" />
        <View style={styles.surfaceRow}>
          <SoftCard style={styles.surfaceCard}>
            <Text style={styles.surfaceLabel}>SOFT CARD</Text>
            <Text style={styles.surfaceTitle}>Quiet structure</Text>
          </SoftCard>
          <GlassCard style={styles.surfaceCard}>
            <Text style={styles.surfaceLabel}>GLASS CARD</Text>
            <Text style={styles.surfaceTitle}>Focused depth</Text>
          </GlassCard>
        </View>
        <View style={styles.statusRow}>
          <StatusPill label="VERIFIED" tone="success" />
          <StatusPill label="REVIEW" tone="warning" />
          <StatusPill label="BLOCKED" tone="error" />
          <StatusPill label="PROCESSING" tone="processing" />
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="SAFETY MODE" title="Deterministic checks" />
        <GlassCard>
          <Text style={styles.guardTitle}>MONI GUARD</Text>
          <Text style={styles.guardSummary}>Every consequence is checked before approval.</Text>
          <View style={styles.checks}>
            <GuardCheck delay={80} message="Available balance covers the plan." rule="BALANCE" status="pass" />
            <GuardCheck delay={160} message="Requested amounts remain unchanged." rule="AMOUNT INTEGRITY" status="pass" />
            <GuardCheck delay={240} message="Human authorization is still required." rule="AUTHORIZATION" status="review" />
          </View>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="PROCESS" title="Progressive disclosure" />
        <SoftCard style={styles.progressCard}>
          <ProgressStep detail="Secure key stays on this device." index={1} state="complete" title="Device wallet" />
          <ProgressStep delay={80} detail="Checking signed ownership proof." index={2} state="active" title="Ownership" />
          <ProgressStep delay={160} detail="Begins after ownership succeeds." index={3} state="pending" title="CNGN wallet" />
        </SoftCard>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="MONEY SPACES" title="Pockets" />
        <View style={styles.surfaceRow}>
          <PocketCard allocatedAmount={20_000} name="Laptop" targetAmount={200_000} />
          <PocketCard allocatedAmount={48_000} name="Tax" targetAmount={120_000} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="FINANCIAL MEMORY" title="Activity" />
        <SoftCard style={styles.activityCard}>
          <ActivityRow amount="−₦40,000" label="GTBank" meta="Provider movement · Processing" source="provider" />
          <ActivityRow amount="₦20,000" label="Laptop" meta="Internal allocation · Mock data" source="internal" />
        </SoftCard>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="CONSEQUENCE MODE" title="Explicit confirmation" />
        <SoftCard style={styles.consequenceCard}>
          <Text style={styles.consequenceEyebrow}>THIS WILL MOVE MONEY OUTSIDE MONIFLOW</Text>
          <MoneyText amount={40_000} />
          <Text style={styles.destination}>to GTBank · ending 8241</Text>
          <ConfirmationButton label="Approve ₦40,000" onPress={() => setConfirmed(true)} />
          {confirmed ? <StatusPill label="CONFIRMED FOR PREVIEW" tone="success" /> : null}
        </SoftCard>
      </View>

      <BottomSheet onClose={() => setSheetVisible(false)} title="Money Plan preview" visible={sheetVisible}>
        <Text style={styles.sheetBody}>
          This component presents focused context without turning every surface into glass.
        </Text>
        <ConfirmationButton
          label="Close preview"
          onPress={() => setSheetVisible(false)}
        />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.huge,
    paddingBottom: spacing.giant,
    paddingTop: spacing.xl
  },
  hero: { gap: spacing.md, paddingVertical: spacing.xl },
  heroTitle: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 48,
    lineHeight: 52,
    maxWidth: 340
  },
  heroBody: { ...typography.body, color: colors.textSecondary, maxWidth: 330 },
  section: { gap: spacing.md },
  swatchGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  swatchItem: { gap: spacing.xs, width: "30%" },
  swatch: { borderColor: colors.borderSoft, borderRadius: radius.md, borderWidth: 1, height: 58 },
  swatchLabel: { ...typography.technical, color: colors.textSecondary, fontSize: 8 },
  typeCard: { gap: spacing.sm },
  technicalSample: { ...typography.technical, color: colors.statusProcessing },
  editorialSample: { ...typography.section, color: colors.textSecondary, fontWeight: "400" },
  flexButton: { flex: 1, paddingHorizontal: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  surfaceRow: { flexDirection: "row", gap: spacing.sm },
  surfaceCard: { flex: 1, gap: spacing.xs, minHeight: 138, padding: spacing.lg },
  surfaceLabel: { ...typography.technical, color: colors.textSecondary, fontSize: 9 },
  surfaceTitle: { ...typography.section, color: colors.textPrimary },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  guardTitle: { ...typography.technical, color: colors.statusSuccess },
  guardSummary: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 25,
    lineHeight: 31,
    marginVertical: spacing.md
  },
  checks: { gap: spacing.xxs },
  progressCard: { gap: spacing.xxs, padding: spacing.md },
  activityCard: { paddingBottom: 0, paddingTop: 0 },
  consequenceCard: { gap: spacing.md },
  consequenceEyebrow: { ...typography.technical, color: colors.statusWarning },
  destination: { ...typography.section, color: colors.textSecondary },
  sheetBody: { ...typography.body, color: colors.textSecondary }
});
