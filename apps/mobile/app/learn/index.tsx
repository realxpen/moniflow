import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { useAuthSession } from "@/services/auth-session";
import { learningReturnRoute, learningSafety, learningSteps } from "@/services/learning-mode";
import { colors, layout, radius, spacing, typography } from "@/theme";

/**
 * Product education only. Never accesses a financial account, API, wallet,
 * device key or approval token. Both practice destinations are already
 * implemented entirely in local simulator state.
 */
export default function LearningHubScreen() {
  const auth = useAuthSession();
  const exit = () => router.replace(learningReturnRoute(Boolean(auth)));

  return (
    <Screen contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>MONIFLOW · LEARNING MODE</Text>
        <Text style={styles.title}>See what your money could do.</Text>
        <Text style={styles.copy}>
          Understand how an instruction becomes a plan, passes safety checks, and waits for your decision.
          These lessons are safe to explore without a BMONI wallet.
        </Text>
        <StatusPill label="OFFLINE PRACTICE · NO REAL FUNDS" tone="warning" />
      </View>

      <SoftCard style={styles.card}>
        <Text style={styles.label}>CHOOSE A PRACTICE PATH</Text>
        <Text style={styles.heading}>Start with the journey, or try the Operator.</Text>
        <Text style={styles.copy}>
          Choose a guided example, experiment with hypothetical amounts, or try a limited
          offline instruction parser. None connects to BMONI, checks your real balance,
          verifies GTBank details, or executes money movement.
        </Text>
        <PrimaryButton onPress={() => router.push("/demo/walkthrough")}>
          Learn the six steps
        </PrimaryButton>
        <SecondaryButton onPress={() => router.push("/demo/operator")}>
          Try interactive Operator practice
        </SecondaryButton>
        <SecondaryButton onPress={() => router.push("/learn/playground")}>
          Experiment with a Money Plan
        </SecondaryButton>
        <SecondaryButton onPress={() => router.push("/learn/intent")}>
          Try the Offline Intent Lab
        </SecondaryButton>
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.label}>HOW MONIFLOW IS DESIGNED TO WORK</Text>
        {learningSteps.map((step) => (
          <View key={step.id} style={styles.step}>
            <View style={styles.number}><Text style={styles.numberText}>{step.number}</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.copy}>{step.description}</Text>
            </View>
          </View>
        ))}
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.label}>SEPARATE FROM YOUR ACCOUNT</Text>
        <Text style={styles.copy}>
          MONIFlow's account readiness, BMONI identity, wallet ownership, KYC, balances and actual activity
          remain separate from Learning Mode. This page never creates a Money Plan on the server.
        </Text>
        <Text style={styles.disclosure}>
          {learningSafety.simulated && !learningSafety.financialOperationsEnabled
            ? "SIMULATED EXAMPLE ONLY · NO FINANCIAL APPROVAL · NO WALLET SIGNING · NOTHING SAVED TO ACCOUNT"
            : "PRACTICE NOT AVAILABLE"}
        </Text>
      </SoftCard>

      <Pressable accessibilityRole="button" onPress={exit} style={styles.exit}>
        <Text style={styles.exitText}>{auth ? "Return to my read-only workspace" : "Return to MONIFlow welcome"}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.xl, paddingTop: spacing.xl, paddingBottom: layout.tabContentBottomInset },
  header: { gap: spacing.md },
  eyebrow: { ...typography.technical, color: colors.statusProcessing },
  title: { ...typography.display, color: colors.textPrimary },
  heading: { ...typography.heading, color: colors.textPrimary },
  copy: { ...typography.body, color: colors.textSecondary },
  label: { ...typography.technical, color: colors.statusProcessing },
  card: { gap: spacing.md },
  step: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", paddingVertical: spacing.sm },
  number: { minHeight: 40, minWidth: 40, borderRadius: radius.lg,
    backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  numberText: { ...typography.technical, color: colors.statusProcessing },
  stepContent: { flex: 1, gap: spacing.xs },
  stepTitle: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  disclosure: { ...typography.technical, color: colors.statusWarning },
  exit: { alignItems: "center", paddingVertical: spacing.lg },
  exitText: { ...typography.caption, fontWeight: "600", color: colors.statusProcessing }
});
