import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { walkthroughCommand, walkthroughNumbers, walkthroughScenario, walkthroughStages } from "@/services/walkthrough";
import { colors, radius, spacing, typography } from "@/theme";

function naira(value: number) { return "₦" + value.toLocaleString("en-NG"); }

export default function WalkthroughScreen() {
  const [index, setIndex] = useState(0);
  const stage = walkthroughStages[index]!;
  const numbers = walkthroughNumbers();
  const last = index === walkthroughStages.length - 1;
  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <FlowHeader eyebrow="GUIDED · SIMULATED WALKTHROUGH" title="See how MONIFlow works."
          description="A standalone explanation of the money workflow while BMONI partner onboarding is pending." />
        <StatusPill label="ILLUSTRATION ONLY · NO REAL FUNDS" tone="warning" />
        <Text style={styles.disclosure}>This walkthrough does not connect to BMONI, submit instructions, approve transfers, or change your wallet.</Text>
      </View>
      <SoftCard style={styles.stepCard}>
        <Text style={styles.eyebrow}>{stage.eyebrow} · {index + 1} OF {walkthroughStages.length}</Text>
        <Text style={styles.title}>{stage.title}</Text>
        <Text style={styles.detail}>{stage.detail}</Text>
        <View style={styles.divider} />
        {index === 0 ? (
          <View style={styles.highlight}><Text style={styles.label}>EXAMPLE INTENT</Text><Text style={styles.command}>{walkthroughCommand}</Text></View>
        ) : index === 1 || index === 2 || index === 3 ? (
          <View style={styles.group}>
            <View style={styles.row}><View style={styles.rowText}><Text style={styles.item}>GTBank withdrawal</Text><Text style={styles.small}>EXTERNAL · requires real authorization</Text></View><Text style={styles.amount}>{naira(walkthroughScenario.withdrawal)}</Text></View>
            <View style={styles.divider} />
            <View style={styles.row}><View style={styles.rowText}><Text style={styles.item}>Laptop Money Space</Text><Text style={styles.small}>INTERNAL · bookkeeping allocation</Text></View><Text style={styles.amount}>{naira(walkthroughScenario.laptopAllocation)}</Text></View>
            {index === 2 ? <Text style={styles.warning}>A real plan must pass MONI Guard. No verification is performed in this example.</Text> : null}
            {index === 3 ? <Text style={styles.warning}>This page contains no approval or signing control. Continue only advances the explanation.</Text> : null}
          </View>
        ) : (
          <View style={styles.group}>
            <View style={styles.row}><Text style={styles.item}>Opening example balance</Text><Text style={styles.amount}>{naira(walkthroughScenario.openingBalance)}</Text></View>
            <View style={styles.row}><Text style={styles.item}>Example withdrawal</Text><Text style={styles.amount}>−{naira(walkthroughScenario.withdrawal)}</Text></View>
            <View style={styles.row}><Text style={styles.item}>Illustrative provider balance</Text><Text style={styles.amount}>{naira(numbers.providerAfter)}</Text></View>
            <View style={styles.row}><Text style={styles.item}>Laptop allocation (internal)</Text><Text style={styles.amount}>−{naira(walkthroughScenario.laptopAllocation)}</Text></View>
            <View style={styles.divider} />
            <View style={styles.row}><Text style={styles.item}>Illustrative available to spend</Text><Text style={styles.total}>{naira(numbers.availableAfter)}</Text></View>
            {last ? (
              <View style={styles.highlight}>
                <Text style={styles.label}>EXAMPLE FINANCIAL MEMORY</Text>
                <Text style={styles.item}>EXT · GTBank · {naira(walkthroughScenario.withdrawal)}</Text>
                <Text style={styles.item}>INT · Laptop · {naira(walkthroughScenario.laptopAllocation)}</Text>
                <Text style={styles.warning}>These entries are not persisted and do not represent completed transactions.</Text>
              </View>
            ) : null}
          </View>
        )}
      </SoftCard>
      <View style={styles.controls}>
        <View style={styles.row}>
          <SecondaryButton disabled={index === 0} onPress={() => setIndex(v => Math.max(0, v - 1))}>Previous</SecondaryButton>
          <PrimaryButton onPress={() => last ? setIndex(0) : setIndex(v => Math.min(walkthroughStages.length - 1, v + 1))}>
            {last ? "Restart walkthrough" : "Next step"}
          </PrimaryButton>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.replace("/onboarding/welcome")} style={styles.leave}><Text style={styles.leaveLabel}>Return to MONIFlow</Text></Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  header: { gap: spacing.sm },
  disclosure: { ...typography.caption, color: colors.statusWarning },
  stepCard: { gap: spacing.md },
  eyebrow: { ...typography.technical, color: colors.statusProcessing },
  title: { ...typography.heading, color: colors.textPrimary },
  detail: { ...typography.body, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.borderSoft },
  label: { ...typography.technical, color: colors.textSecondary },
  highlight: { gap: spacing.sm, backgroundColor: colors.backgroundSecondary, borderRadius: radius.lg, padding: spacing.lg },
  command: { ...typography.command, color: colors.textPrimary },
  group: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  rowText: { flex: 1, gap: spacing.xs },
  item: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  small: { ...typography.caption, color: colors.textSecondary },
  amount: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  total: { ...typography.section, color: colors.statusSuccess },
  warning: { ...typography.caption, color: colors.statusWarning },
  controls: { gap: spacing.md },
  leave: { alignItems: "center", paddingVertical: spacing.md },
  leaveLabel: { ...typography.body, color: colors.textSecondary }
});
