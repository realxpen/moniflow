import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import {
  interpretOfflineExample, offlineIntentExamples, type OfflineIntentLabResult
} from "@/services/offline-intent-lab";
import { colors, layout, radius, spacing, typography } from "@/theme";

const naira = (n: number) => "₦" + n.toLocaleString("en-NG");

/** Educational subset only: never sends entered text or calls a provider. */
export default function IntentLabScreen() {
  const [command, setCommand] = useState<string>(offlineIntentExamples[0].command);
  const [evaluated, setEvaluated] = useState<OfflineIntentLabResult | null>(null);
  const chosen = (value: string) => {
    setCommand(value);
    setEvaluated(null);
  };
  const hasResult = evaluated !== null;
  const valid = evaluated?.state === "RECOGNIZED";
  const preview = valid ? evaluated?.preview : null;

  return (
    <Screen contentContainerStyle={styles.page}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>LEARNING MODE · INTENT LAB</Text>
        <Text style={styles.title}>Turn a sentence into an example plan.</Text>
        <Text style={styles.body}>
          Write a simple example instruction and see whether this offline teaching parser recognizes it.
          It supports GTBank withdrawal and Laptop allocation examples—not open-ended banking instructions.
        </Text>
        <StatusPill label="LOCAL TEACHING PARSER · NO REAL MONEY" tone="warning" />
      </View>

      <SoftCard style={styles.card}>
        <Text style={styles.label}>PRACTICE PHRASES</Text>
        <View style={styles.presets}>
          {offlineIntentExamples.map(example => (
            <Pressable
              key={example.id} accessibilityRole="button"
              accessibilityState={{ selected: example.command === command }}
              style={[styles.preset, example.command === command && styles.presetActive]}
              onPress={() => chosen(example.command)}>
              <Text style={[styles.presetLabel, example.command === command && styles.presetLabelActive]}>
                {example.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>EXAMPLE INSTRUCTION</Text>
        <TextInput
          accessibilityLabel="Offline example money instruction"
          multiline maxLength={220}
          style={styles.input}
          value={command}
          placeholder="Withdraw ₦40,000 to GTBank and save ₦20,000 for my laptop."
          placeholderTextColor={colors.textSecondary}
          onChangeText={chosen}
          textAlignVertical="top"
        />
        <Text style={styles.helper}>
          Use only hypothetical amounts and the supported bank/pocket names. Do not enter real account numbers, passwords, PINs or personal details.
        </Text>
        <PrimaryButton onPress={() => setEvaluated(interpretOfflineExample(command))}>
          Interpret this example locally
        </PrimaryButton>
      </SoftCard>

      {hasResult && evaluated ? (
        <SoftCard style={styles.card}>
          <Text style={styles.label}>OFFLINE INTERPRETATION</Text>
          <StatusPill
            label={evaluated.state === "RECOGNIZED" ? "EXAMPLE RECOGNIZED" :
              evaluated.state === "BLOCKED" ? "ILLUSTRATIVE PLAN BLOCKED" :
              evaluated.state === "PROVIDER_READ_REQUIRED" ? "LIVE DATA NOT AVAILABLE" : "UNSUPPORTED EXAMPLE"}
            tone={valid ? "processing" : "warning"}
          />
          <Text style={styles.body}>{evaluated.explanation}</Text>
          {evaluated.actions.map((action, index) => (
            <View style={styles.action} key={action.kind}>
              <Text style={styles.actionTitle}>
                {index + 1}. {action.kind === "BANK_WITHDRAWAL" ? "External GTBank withdrawal" : "Internal Laptop allocation"}
              </Text>
              <Text style={styles.actionAmount}>{naira(action.amount)}</Text>
              <Text style={styles.body}>
                {action.kind === "BANK_WITHDRAWAL"
                  ? "GTBank is an example destination, not a verified account."
                  : "Money Space allocation is hypothetical bookkeeping, not a second provider-held wallet."}
              </Text>
            </View>
          ))}
          {preview?.status === "MATH_PREVIEW" &&
            preview.providerAfter !== null && preview.availableAfter !== null ? (
              <View style={styles.figures}>
                <Text style={styles.label}>FIXED EXAMPLE OPENING BALANCE · ₦300,000</Text>
                <Figure label="Hypothetical provider amount" value={naira(preview.providerAfter)} />
                <Figure label="Hypothetical available amount" value={naira(preview.availableAfter)} strong />
              </View>
            ) : null}
          <Text style={styles.disclosure}>
            NOT A SERVER MONEY PLAN · NOT A MONI GUARD APPROVAL · BANK NOT VERIFIED · NO SIGNING OR TRANSFER
          </Text>
          <SecondaryButton onPress={() => { chosen(offlineIntentExamples[0].command); }}>
            Restore canonical instruction
          </SecondaryButton>
        </SoftCard>
      ) : null}

      <SoftCard style={styles.card}>
        <Text style={styles.label}>WHAT THIS PROVES</Text>
        <Text style={styles.body}>
          A simple deterministic rule can recognize a small set of financial phrases, preserve
          action types, and block ambiguous or overspending instructions. Real MONIFlow
          plans, bank verification, wallet ownership and human approval require separate
          authorized systems that this lab never contacts.
        </Text>
      </SoftCard>

      <PrimaryButton onPress={() => router.replace("/learn")}>Return to Learning & Practice</PrimaryButton>
    </Screen>
  );
}

function Figure({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.figure}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={[styles.figureValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.xl, paddingTop: spacing.xl, paddingBottom: layout.tabContentBottomInset },
  heading: { gap: spacing.md },
  eyebrow: { ...typography.technical, color: colors.statusProcessing },
  title: { ...typography.display, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
  helper: { ...typography.caption, color: colors.statusWarning },
  label: { ...typography.technical, color: colors.statusProcessing },
  card: { gap: spacing.md },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  preset: { borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.backgroundPrimary,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  presetActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentPrimary },
  presetLabel: { ...typography.caption, color: colors.textSecondary },
  presetLabelActive: { fontWeight: "700", color: colors.textPrimary },
  input: { ...typography.body, minHeight: 120, padding: spacing.md, borderWidth: 1,
    borderColor: colors.borderSoft, borderRadius: radius.lg,
    backgroundColor: colors.backgroundPrimary, color: colors.textPrimary },
  action: { gap: spacing.xs, paddingVertical: spacing.sm },
  actionTitle: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  actionAmount: { ...typography.section, color: colors.textPrimary },
  figures: { gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.backgroundSecondary },
  figure: { flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  figureLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  figureValue: { ...typography.section, color: colors.textPrimary, flexShrink: 1, textAlign: "right" },
  strong: { color: colors.statusSuccess, fontWeight: "700" },
  disclosure: { ...typography.technical, color: colors.statusWarning }
});
