import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { ProgressStep } from "@/components/operator";
import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { mockDisclosure } from "@/constants/mockData";
import { colors, spacing, typography } from "@/theme";

export default function SigningScreen() {
  return (
    <Screen contentContainerStyle={styles.screen}>
      <FlowHeader
        description="Future signing stays on-device. This route demonstrates the boundary without simulating a signature."
        eyebrow="DEVICE BOUNDARY"
        title="Your device. Your authorization."
      />
      <SoftCard style={styles.card}>
        <StatusPill label="SDK NOT CONNECTED" tone="warning" />
        <Text style={styles.cardTitle}>No private key leaves the device.</Text>
        <Text style={styles.cardCopy}>
          Phase 5 will implement the verified BMONI wallet and ownership flow. No signing payload,
          proposal, or signature exists in this static preview.
        </Text>
      </SoftCard>
      <View style={styles.steps}>
        <ProgressStep index={1} state="complete" title="Human review" detail="Static UI confirmation recorded locally" />
        <ProgressStep index={2} state="active" title="Device signature" detail="Not connected in Phase 3" />
        <ProgressStep index={3} state="pending" title="Provider submission" detail="BMONI is not contacted" />
      </View>
      <PrimaryButton onPress={() => router.push("/operator/result")}>
        Continue to result preview
      </PrimaryButton>
      <Text style={styles.disclosure}>{mockDisclosure}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.backgroundSecondary, gap: spacing.md },
  cardTitle: { ...typography.heading, color: colors.textPrimary },
  cardCopy: { ...typography.body, color: colors.textSecondary },
  steps: { gap: spacing.xs },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
