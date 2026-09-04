import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { ProgressStep } from "@/components/operator";
import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { mockDisclosure, mockHomeData } from "@/constants/mockData";
import { colors, spacing, typography } from "@/theme";

export default function ProcessingScreen() {
  return (
    <Screen contentContainerStyle={styles.screen}>
      <FlowHeader
        description="Understandable states only—never hidden reasoning and never direct execution."
        eyebrow="INTELLIGENCE MODE"
        title="Preparing a plan preview."
      />
      <SoftCard style={styles.commandCard}>
        <Text style={styles.label}>DEMO INSTRUCTION</Text>
        <Text style={styles.command}>{mockHomeData.command}</Text>
      </SoftCard>
      <View style={styles.progressCard}>
        <StatusPill label="STATIC PROCESSING" tone="processing" />
        <ProgressStep index={1} state="complete" title="Normalize instruction" detail="Preview state" />
        <ProgressStep delay={90} index={2} state="complete" title="Identify supported actions" detail="Preview state" />
        <ProgressStep delay={180} index={3} state="active" title="Structure Money Plan" detail="No parser is running" />
        <ProgressStep delay={270} index={4} state="pending" title="Prepare review" detail="Human approval stays required" />
      </View>
      <PrimaryButton onPress={() => router.push("/operator/plan")}>View static Money Plan</PrimaryButton>
      <Text style={styles.disclosure}>{mockDisclosure}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingBottom: spacing.xxl },
  commandCard: { backgroundColor: colors.accentSoft, gap: spacing.sm },
  label: { ...typography.technical, color: colors.statusProcessing },
  command: { ...typography.command, color: colors.textPrimary },
  progressCard: { gap: spacing.xs },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
