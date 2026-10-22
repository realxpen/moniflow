import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { demoFinancialSnapshot, demoGuardChecks, demoOperatorTransition, initialDemoOperatorState,
  isSupportedDemoCommand, type DemoOperatorAction } from "@/services/operator-demo";
import { walkthroughCommand, walkthroughNumbers, walkthroughScenario } from "@/services/walkthrough";
import { colors, radius, spacing, typography } from "@/theme";

const naira = (amount: number) => "₦" + amount.toLocaleString("en-NG");
const order = ["intent", "plan", "guard", "approval", "execution", "result"];

export default function DemoOperatorScreen() {
  const [state, setState] = useState(initialDemoOperatorState);
  const [command, setCommand] = useState(walkthroughCommand);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const stage = state.stage;
  const scrollRef = useRef<ScrollView>(null);
  const previousStageRef = useRef(stage);

  useEffect(() => {
    if (previousStageRef.current === stage) return;
    previousStageRef.current = stage;
    // Native ScrollView preserves its offset when React swaps step content.
    // Scroll once immediately and after native layout so the new heading stays visible.
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [stage]);
  const snapshot = demoFinancialSnapshot(state);
  const nums = walkthroughNumbers();
  const act = (a: DemoOperatorAction) => { setState(s => demoOperatorTransition(s, a)); setError(""); };
  const reset = () => { act({ type: "RESET" }); setChecked(false); setCommand(walkthroughCommand); };
  const sendExample = () => {
    if (!isSupportedDemoCommand(command)) {
      setError("This offline demo supports only the canonical sample instruction. Nothing was sent.");
      return;
    }
    act({ type: "PARSE", command });
  };
  const titles: Record<string, string> = {
    intent: "Tell your money what to do.", plan: "Review your Money Plan.",
    guard: "Check the example rules.", approval: "The human decides.",
    execution: "Preview the hypothetical result.", result: "A simulated outcome.",
    cancelled: "This example was stopped."
  };
  return (
    <Screen contentContainerStyle={styles.page} scrollRef={scrollRef}
      scrollProps={{ keyboardDismissMode: "on-drag", keyboardShouldPersistTaps: "handled" }}>
      <FlowHeader eyebrow="MONIFLOW OPERATOR · INTERACTIVE DEMO" title={titles[stage]}
        description="A temporary, offline illustration of Intent → Plan → Guard → Human Review → Result. No live financial system is connected to this screen." />
      <StatusPill label="SIMULATION · NO ACTUAL FUNDS" tone="warning" />
      <Text style={styles.disclosure}>No BMONI API request, bank verification, financial approval, wallet signing, transfer, or saved Financial Memory occurs in this demonstration.</Text>
      <Text accessibilityRole="text" style={styles.stageCounter}>
        {stage === "cancelled" ? "EXAMPLE CANCELLED" : `STEP ${order.indexOf(stage) + 1} OF ${order.length}`}
      </Text>
      <View accessibilityRole="progressbar"
        accessibilityLabel="Illustrative Operator progress"
        accessibilityValue={{ min: 0, max: order.length, now: Math.max(0, order.indexOf(stage) + 1) }}
        style={styles.progress}>
        {order.map((key, i) => <View key={key} style={[styles.bar, key === stage && styles.now, i < order.indexOf(stage) && styles.past]} />)}
      </View>

      {stage === "intent" ? (
        <SoftCard style={styles.card}>
          <Text style={styles.micro}>01 / INTENT · PRE-SET EXAMPLE ONLY</Text>
          <Text style={styles.copy}>The local simulator accepts the canonical instruction and nothing else. It does not use MONIFlow's production parser.</Text>
          <TextInput accessibilityLabel="Example financial instruction" multiline style={styles.command} value={command} onChangeText={setCommand} />
          <SecondaryButton onPress={() => { setCommand(walkthroughCommand); setError(""); }}>Restore sample instruction</SecondaryButton>
          <PrimaryButton onPress={sendExample}>Interpret example locally</PrimaryButton>
        </SoftCard>
      ) : null}

      {stage === "plan" ? (
        <SoftCard style={styles.card}>
          <Text style={styles.micro}>02 / HYPOTHETICAL MONEY PLAN</Text>
          <StatusPill label="NOT A SERVER PLAN" tone="processing" />
          <MoneyRow name="Opening example balance" amount={naira(walkthroughScenario.openingBalance)} />
          <MoneyRow name="GTBank withdrawal · external" amount={"−" + naira(walkthroughScenario.withdrawal)} />
          <MoneyRow name="Laptop Money Space · internal" amount={"−" + naira(walkthroughScenario.laptopAllocation)} />
          <View style={styles.rule} />
          <MoneyRow name="Example provider balance after" amount={naira(nums.providerAfter)} />
          <MoneyRow name="Example available to spend" amount={naira(nums.availableAfter)} strong />
          <Text style={styles.copy}>The Laptop allocation is bookkeeping, not another provider-held wallet. This plan does not touch actual balances.</Text>
          <PrimaryButton onPress={() => act({ type: "REVIEW_PLAN" })}>Review example checks</PrimaryButton>
        </SoftCard>
      ) : null}

      {stage === "guard" ? (
        <SoftCard style={styles.card}>
          <Text style={styles.micro}>03 / ILLUSTRATIVE GUARD CHECKS</Text>
          <StatusPill label="REAL MONI GUARD NOT RUN" tone="warning" />
          {demoGuardChecks().map(row => (
            <View key={row.label} style={styles.check}>
              <Text style={styles.item}>{row.passed ? "EXAMPLE OK" : "NOT VERIFIED"} · {row.label}</Text>
              <Text style={styles.caption}>{row.detail}</Text>
            </View>
          ))}
          <Text style={styles.copy}>A real transfer would stay blocked until GTBank account verification and MONI Guard's authoritative checks succeed. This screen grants neither.</Text>
          <PrimaryButton onPress={() => act({ type: "REVIEW_GUARD" })}>Continue to human review</PrimaryButton>
        </SoftCard>
      ) : null}

      {stage === "approval" ? (
        <SoftCard style={styles.card}>
          <Text style={styles.micro}>04 / EXPLICIT DEMO ACKNOWLEDGEMENT</Text>
          <Text style={styles.copy}>Example withdrawal: {naira(walkthroughScenario.withdrawal)} to GTBank. Example internal Laptop allocation: {naira(walkthroughScenario.laptopAllocation)}. This is not a live approval.</Text>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }}
            accessibilityLabel="I understand this is an offline demonstration, not a real financial approval"
            onPress={() => setChecked(v => !v)} style={styles.checkboxRow}>
            <View style={[styles.checkbox, checked && styles.selected]} accessible={false}>
              {checked ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={[styles.copy, { flex: 1 }]}>I understand that this demonstration cannot authorize any real transaction.</Text>
          </Pressable>
          <PrimaryButton disabled={!checked} onPress={() => act({ type: "APPROVE_SIMULATION", acknowledged: checked })}>Confirm demo only · no payment</PrimaryButton>
          <SecondaryButton onPress={() => act({ type: "CANCEL" })}>Cancel example</SecondaryButton>
        </SoftCard>
      ) : null}

      {stage === "execution" ? (
        <SoftCard style={styles.card}>
          <Text style={styles.micro}>05 / EXPLICIT LOCAL SIMULATION</Text>
          <StatusPill label="NO FINANCIAL EXECUTION" tone="warning" />
          <Text style={styles.copy}>The example is acknowledged, but not yet simulated. The next button calculates a hypothetical result entirely in this screen's memory. No API, wallet, proposal, PIN or signature is involved.</Text>
          <PrimaryButton onPress={() => act({ type: "SIMULATE_EXECUTION" })}>Show hypothetical outcome</PrimaryButton>
          <SecondaryButton onPress={() => act({ type: "CANCEL" })}>Cancel example</SecondaryButton>
        </SoftCard>
      ) : null}

      {stage === "result" && snapshot ? (
        <SoftCard style={styles.card}>
          <Text style={styles.micro}>06 / SIMULATED RESULT · NOT SETTLED</Text>
          <StatusPill label="ILLUSTRATION COMPLETE" tone="warning" />
          <MoneyRow name="Hypothetical provider balance" amount={naira(snapshot.providerAfter)} />
          <MoneyRow name="Hypothetical Laptop allocation" amount={naira(snapshot.pocketAmount)} />
          <MoneyRow name="Hypothetical available to spend" amount={naira(snapshot.availableAfter)} strong />
          <View style={styles.rule} />
          <Text style={styles.micro}>ILLUSTRATIVE FINANCIAL MEMORY · NOT SAVED</Text>
          {snapshot.activity.map(item => (
            <View key={item.type} style={styles.check}>
              <Text style={styles.item}>{item.label}</Text>
              <Text style={styles.caption}>{naira(item.amount)} · SIMULATED ONLY</Text>
            </View>
          ))}
          <Text style={styles.copy}>No real funds moved. No BMONI result was received. The actual Pockets, Activity and balance remain untouched.</Text>
          <PrimaryButton onPress={reset}>Restart simulated Operator</PrimaryButton>
        </SoftCard>
      ) : null}

      {stage === "cancelled" ? (
        <SoftCard style={styles.card}>
          <StatusPill label="EXAMPLE CANCELLED" tone="neutral" />
          <Text style={styles.copy}>No outcome was calculated or recorded, and no network or provider action occurred.</Text>
          <PrimaryButton onPress={reset}>Start over</PrimaryButton>
        </SoftCard>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {["intent", "plan", "guard"].includes(stage) ? <SecondaryButton onPress={() => act({ type: "CANCEL" })}>Stop example</SecondaryButton> : null}
      <Pressable accessibilityRole="button" onPress={() => router.replace("/learn")} style={styles.leave}>
        <Text style={styles.caption}>Return to Learning & Practice</Text>
      </Pressable>
    </Screen>
  );
}

function MoneyRow({ name, amount, strong = false }: { name: string; amount: string; strong?: boolean }) {
  return <View style={styles.moneyRow}><Text style={styles.moneyName}>{name}</Text>
    <Text style={[styles.moneyValue, strong && styles.moneyStrong]}>{amount}</Text></View>;
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  disclosure: { ...typography.caption, color: colors.statusWarning, fontSize: 14, lineHeight: 20 },
  stageCounter: { ...typography.caption, color: colors.textSecondary, fontWeight: "600" },
  progress: { flexDirection: "row", gap: spacing.xs },
  bar: { flex: 1, height: 5, backgroundColor: colors.borderSoft, borderRadius: radius.pill },
  now: { backgroundColor: colors.accentPrimary },
  past: { backgroundColor: colors.statusSuccess },
  card: { gap: spacing.lg },
  micro: { ...typography.technical, color: colors.statusProcessing, fontSize: 12, lineHeight: 18 },
  copy: { ...typography.body, color: colors.textSecondary },
  caption: { ...typography.caption, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  command: { ...typography.body, backgroundColor: colors.backgroundPrimary, borderWidth: 1,
    borderColor: colors.borderSoft, borderRadius: radius.lg, minHeight: 104,
    padding: spacing.md, color: colors.textPrimary, textAlignVertical: "top" },
  rule: { height: 1, backgroundColor: colors.borderSoft },
  check: { gap: spacing.xs },
  item: { ...typography.body, fontWeight: "600", color: colors.textPrimary },
  moneyRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", justifyContent: "space-between" },
  moneyName: { ...typography.body, flex: 1, color: colors.textSecondary },
  moneyValue: { ...typography.section, color: colors.textPrimary, flexShrink: 1, textAlign: "right" },
  moneyStrong: { color: colors.statusSuccess, fontWeight: "700" },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 44 },
  checkbox: { alignItems: "center", justifyContent: "center", height: 24, width: 24, borderWidth: 1, borderRadius: radius.sm, borderColor: colors.borderSoft },
  selected: { backgroundColor: colors.statusSuccess, borderColor: colors.statusSuccess },
  checkmark: { ...typography.body, color: colors.surface, fontWeight: "800", textAlign: "center" },
  error: { ...typography.caption, color: colors.statusError },
  leave: { alignItems: "center", paddingVertical: spacing.md }
});
