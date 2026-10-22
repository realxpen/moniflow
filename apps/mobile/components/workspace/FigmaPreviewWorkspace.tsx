import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { interpretOfflineExample } from "@/services/offline-intent-lab";
import { practicePockets, practiceSummary, type PracticePocket } from "@/services/offline-pocket-ledger";
import { useProductPreview } from "@/store/product-preview";
import { colors, layout, radius, spacing, typography } from "@/theme";

type Tab = "home" | "pockets" | "activity";
const money = (n: number) => "₦" + n.toLocaleString("en-NG");
const example = "Withdraw ₦40,000 to my GTBank account and save ₦20,000 for my laptop.";

/** Figma-inspired, owner-bound demo surface. NEVER displays an authenticated financial balance. */
export function FigmaPreviewWorkspace({ tab, ownerId, onExit }: {
  tab: Tab; ownerId: string; onExit: () => void;
}) {
  const ledger = useProductPreview(s => s.ledger);
  const simulate = useProductPreview(s => s.simulate);
  const simulateInstruction = useProductPreview(s => s.simulateInstruction);
  const lastMessage = useProductPreview(s => s.lastMessage);
  const lastResult = useProductPreview(s => s.lastResult);
  const [command, setCommand] = useState(example);
  const [reviewed, setReviewed] = useState(false);
  const [pocket, setPocket] = useState<PracticePocket>("Laptop");
  const [amount, setAmount] = useState("20000");
  const summary = practiceSummary(ledger);
  const parsed = reviewed ? interpretOfflineExample(command) : null;
  const totalRequested = parsed?.actions.reduce((sum, action) => sum + action.amount, 0) ?? 0;
  const planAllowed = parsed?.state === "RECOGNIZED" && totalRequested <= summary.available;
  const submit = () => {
    simulateInstruction(ownerId, command);
    setReviewed(false);
  };

  return (
    <Screen contentContainerStyle={styles.page}>
      <View style={styles.modeHeading}>
        <View style={styles.modeCopy}>
          <Text style={styles.eyebrow}>MONIFLOW · INTERACTIVE DEMO</Text>
          <Text style={styles.modeNote}>Example funds only · not your account</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onExit} style={styles.exitButton}>
          <Text style={styles.exitText}>Exit demo</Text>
        </Pressable>
      </View>
      <StatusPill label="SIMULATED DATA · NO REAL PAYMENTS" tone="warning" />

      {tab === "home" ? (
        <>
          <View style={styles.header}>
            <Text style={styles.greeting}>Good to see you.</Text>
            <Text style={styles.title}>Your money, in focus.</Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.eyebrow}>AVAILABLE TO USE · EXAMPLE</Text>
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.balance}>{money(summary.available)}</Text>
            <Text style={styles.balanceSub}>Simulated balance · NGN · not a BMONI wallet</Text>
            <View style={styles.balanceFooter}>
              <Text style={styles.small}>Provider illustration: {money(summary.providerBalance)}</Text>
              <Text style={styles.small}>In Pockets: {money(summary.allocated)}</Text>
            </View>
          </View>
          <View style={styles.quickActions}>
            <Pressable accessibilityRole="button" style={styles.quick}
              onPress={() => simulate(ownerId, { type: "ALLOCATE", pocket: "Laptop", amountText: "20000" })}>
              <Text style={styles.quickText}>+ Save example ₦20k</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.quick}
              onPress={() => simulate(ownerId, { type: "WITHDRAW", amountText: "40000" })}>
              <Text style={styles.quickText}>↗ Try withdrawal</Text>
            </Pressable>
          </View>
          <SoftCard style={styles.operatorCard}>
            <Text style={styles.operatorEyebrow}>✦  MONIFLOW OPERATOR · DEMO</Text>
            <Text style={styles.operatorHeading}>What should your money do?</Text>
            <TextInput accessibilityLabel="Illustrative money instruction"
              value={command} onChangeText={(next) => { setCommand(next); setReviewed(false); }}
              multiline maxLength={220} placeholder="Ask MONIFlow..."
              placeholderTextColor={colors.textSecondary} style={styles.commandInput} />
            <Pressable accessibilityRole="button" onPress={() => setReviewed(true)}
              style={styles.operatorAction}>
              <Text style={styles.operatorActionText}>Review example Money Plan</Text>
              <Text style={styles.operatorActionText}>→</Text>
            </Pressable>
            <Text style={styles.operatorDisclosure}>SUPPORTED EXAMPLES ONLY · NOT MONI GUARD · NO SIGNING</Text>
          </SoftCard>
          {reviewed ? (
            <SoftCard style={styles.card}>
              <Text style={styles.eyebrow}>LOCAL PLAN REVIEW · NOT APPROVED</Text>
              <Text style={styles.sectionTitle}>{planAllowed ? "Here is your example plan." : "This example cannot proceed."}</Text>
              <Text style={styles.body}>{parsed?.explanation}</Text>
              {parsed?.actions.map((action, index) => (
                <Line key={index} name={action.kind === "BANK_WITHDRAWAL" ? "GTBank · unverified" : "Laptop · internal"}
                  value={"−" + money(action.amount)} />
              ))}
              <Text style={styles.body}>
                {planAllowed
                  ? "These actions will modify only the temporary demo ledger and its activity history."
                  : "No changes have been made. Adjust the instruction or remaining illustrative funds."}
              </Text>
              {planAllowed ? <PrimaryButton onPress={submit}>Simulate plan · no payment</PrimaryButton> : null}
              <SecondaryButton onPress={() => setReviewed(false)}>Return to instruction</SecondaryButton>
            </SoftCard>
          ) : null}
          <Text style={styles.eyebrow}>MONEY POCKETS</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/pockets")} style={styles.summaryRow}>
            <View style={styles.flex}><Text style={styles.rowTitle}>Laptop goal</Text>
              <Text style={styles.small}>{money(ledger.allocated.Laptop)} allocated · example target ₦200,000</Text></View>
            <Text style={styles.chevron}>→</Text>
          </Pressable>
          <Text style={styles.eyebrow}>HUSTLE PAYMENT TESTING</Text>
          <SoftCard style={styles.card}>
            <Text style={styles.rowTitle}>Partner sandbox contract ready</Text>
            <Text style={styles.body}>
              Hustle can send signed collection, payout and refund test commands to MONIFlow's
              isolated server-to-server sandbox. Accepted means RECEIVED, not paid.
              No real provider or escrow is connected.
            </Text>
          </SoftCard>
        </>
      ) : null}

      {tab === "pockets" ? (
        <>
          <Text style={styles.title}>Money pockets.</Text>
          <Text style={styles.body}>Put example money aside for what matters.</Text>
          <View style={styles.balanceCard}>
            <Text style={styles.eyebrow}>TOTAL ALLOCATED · DEMO</Text>
            <Text style={styles.balance}>{money(summary.allocated)}</Text>
            <Text style={styles.balanceSub}>Available example balance: {money(summary.available)}</Text>
          </View>
          {practicePockets.map((name) => (
            <SoftCard key={name} style={styles.card}>
              <Line name={name} value={money(ledger.allocated[name])} />
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(100, ledger.allocated[name] / 200000 * 100)}%` as const }]} />
              </View>
              <Text style={styles.small}>Illustrative target: ₦200,000 · internal bookkeeping only</Text>
            </SoftCard>
          ))}
          <SoftCard style={styles.card}>
            <Text style={styles.eyebrow}>MANAGE EXAMPLE POCKETS</Text>
            <View style={styles.pocketChoices}>
              {practicePockets.map(name => (
                <Pressable key={name} accessibilityRole="button" accessibilityState={{ selected: pocket === name }}
                  style={[styles.choice, name === pocket && styles.choiceActive]} onPress={() => setPocket(name)}>
                  <Text style={styles.choiceText}>{name}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput accessibilityLabel="Demo Pocket amount in whole naira"
              value={amount} onChangeText={setAmount} keyboardType="numeric" maxLength={10}
              style={styles.amountInput} placeholder="20000" placeholderTextColor={colors.textSecondary} />
            <PrimaryButton onPress={() => simulate(ownerId, { type: "ALLOCATE", pocket, amountText: amount })}>
              Allocate demo funds
            </PrimaryButton>
            <SecondaryButton onPress={() => simulate(ownerId, { type: "RELEASE", pocket, amountText: amount })}>
              Release demo allocation
            </SecondaryButton>
          </SoftCard>
        </>
      ) : null}

      {tab === "activity" ? (
        <>
          <Text style={styles.title}>Your activity.</Text>
          <Text style={styles.body}>Every item below is a temporary simulated event.</Text>
          <View style={styles.balanceCard}>
            <Text style={styles.eyebrow}>EXAMPLE FINANCIAL MEMORY</Text>
            <Text style={styles.balance}>{ledger.entries.length}</Text>
            <Text style={styles.balanceSub}>Simulated entries · none are actual provider receipts</Text>
          </View>
          <Text style={styles.eyebrow}>RECENT EXAMPLE EVENTS</Text>
          {ledger.entries.length ? ledger.entries.map(entry => (
            <View key={entry.id} style={styles.summaryRow}>
              <View style={styles.flex}><Text style={styles.rowTitle}>{entry.label}</Text>
                <Text style={styles.small}>SIMULATED · NOT SETTLED · EVENT {entry.id}</Text></View>
              <Text style={styles.rowAmount}>{entry.kind === "SIMULATED_RELEASE" ? "+" : "−"}{money(entry.amount)}</Text>
            </View>
          )) : (
            <SoftCard style={styles.card}>
              <Text style={styles.rowTitle}>No demo activity yet.</Text>
              <Text style={styles.body}>Try an action from Home or Pockets and it will appear here.</Text>
            </SoftCard>
          )}
          <Text style={styles.disclosure}>NO REAL FINANCIAL MEMORY · NO PROVIDER RESPONSE · NO FUNDS MOVED</Text>
        </>
      ) : null}

      {lastMessage ? (
        <SoftCard style={styles.card}>
          <Text style={[styles.eyebrow, lastResult === "BLOCKED" && styles.warning]}>
            {lastResult === "BLOCKED" ? "DEMO ACTION BLOCKED" : "DEMO UPDATED · NO REAL PAYMENT"}
          </Text>
          <Text style={styles.body}>{lastMessage}</Text>
        </SoftCard>
      ) : null}
      <SecondaryButton onPress={() => simulate(ownerId, { type: "RESET" })}>Reset demo funds & history</SecondaryButton>
      <Text style={styles.disclosure}>DEMO MODE · NOT A BMONI BALANCE · NOT A BANK ACCOUNT · NO REAL MONEY</Text>
    </Screen>
  );
}

function Line({ name, value }: { name: string; value: string }) {
  return <View style={styles.line}><Text style={styles.lineName}>{name}</Text>
    <Text style={styles.lineValue}>{value}</Text></View>;
}
const styles = StyleSheet.create({
  page: { gap: spacing.lg, paddingTop: spacing.lg, paddingBottom: layout.tabContentBottomInset },
  modeHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  modeCopy: { flex: 1, gap: spacing.xxs },
  modeNote: { ...typography.caption, color: colors.textSecondary },
  eyebrow: { ...typography.technical, color: colors.statusProcessing },
  exitButton: { minHeight: 44, justifyContent: "center", backgroundColor: colors.surface,
    borderRadius: radius.pill, paddingHorizontal: spacing.md },
  exitText: { ...typography.caption, fontWeight: "700", color: colors.textPrimary },
  header: { gap: spacing.xs },
  greeting: { ...typography.body, color: colors.textSecondary },
  title: { ...typography.heading, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
  small: { ...typography.caption, color: colors.textSecondary },
  balanceCard: { backgroundColor: colors.accentSoft, borderRadius: radius.card, padding: spacing.xl, gap: spacing.md },
  balance: { ...typography.display, fontVariant: ["tabular-nums"], color: colors.textPrimary, fontSize: 42 },
  balanceSub: { ...typography.caption, color: colors.statusProcessing },
  balanceFooter: { gap: spacing.xxs, paddingTop: spacing.xs },
  quickActions: { flexDirection: "row", gap: spacing.sm },
  quick: { flex: 1, minHeight: 52, borderRadius: radius.lg, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.sm },
  quickText: { ...typography.caption, color: colors.textPrimary, fontWeight: "700" },
  operatorCard: { backgroundColor: colors.surfaceStrong, borderRadius: radius.card, gap: spacing.md, padding: spacing.xl },
  operatorEyebrow: { ...typography.technical, color: colors.accentSoft },
  operatorHeading: { ...typography.heading, color: colors.textInverse },
  commandInput: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surface,
    minHeight: 86, borderRadius: radius.lg, padding: spacing.md, textAlignVertical: "top" },
  operatorAction: { backgroundColor: colors.surface, minHeight: 50, borderRadius: radius.pill,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg },
  operatorActionText: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  operatorDisclosure: { ...typography.technical, color: colors.accentSoft, fontSize: 10 },
  card: { gap: spacing.md },
  sectionTitle: { ...typography.section, color: colors.textPrimary },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, minHeight: 64 },
  flex: { flex: 1, gap: spacing.xxs },
  rowTitle: { ...typography.body, color: colors.textPrimary, fontWeight: "700" },
  rowAmount: { ...typography.section, color: colors.textPrimary },
  chevron: { ...typography.section, color: colors.statusProcessing },
  line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  lineName: { ...typography.body, color: colors.textPrimary, flex: 1 },
  lineValue: { ...typography.section, color: colors.textPrimary },
  progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.backgroundSecondary, overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: colors.accentPrimary, borderRadius: radius.pill },
  pocketChoices: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: { borderRadius: radius.pill, paddingHorizontal: spacing.md, minHeight: 44,
    borderWidth: 1, borderColor: colors.borderSoft, justifyContent: "center" },
  choiceActive: { borderColor: colors.accentPrimary, backgroundColor: colors.accentSoft },
  choiceText: { ...typography.caption, color: colors.textPrimary },
  amountInput: { ...typography.section, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.borderSoft, backgroundColor: colors.surface, padding: spacing.md, minHeight: 52, color: colors.textPrimary },
  disclosure: { ...typography.technical, color: colors.statusWarning, textAlign: "center" },
  warning: { color: colors.statusError }
});
