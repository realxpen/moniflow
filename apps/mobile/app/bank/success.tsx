import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { mockDisclosure } from "@/constants/mockData";
import { colors, spacing, typography } from "@/theme";

export default function BankSuccessScreen() {
  return (
    <Screen contentContainerStyle={styles.screen} scroll={false}>
      <View style={styles.content}>
        <FlowHeader
          description="The destination route works, while provider verification remains intentionally absent."
          eyebrow="BANK PREVIEW · 03"
          title="Destination preview ready."
        />
        <SoftCard style={styles.card}>
          <StatusPill label="NOT SAVED" tone="warning" />
          <Text style={styles.cardTitle}>GTBank · •••• 0194</Text>
          <Text style={styles.cardCopy}>
            No bank account was discovered, verified, or stored. The next bank phase will use only
            documented provider behavior.
          </Text>
        </SoftCard>
      </View>
      <View style={styles.actions}>
        <PrimaryButton onPress={() => router.replace("/(tabs)/home")}>Return home</PrimaryButton>
        <SecondaryButton onPress={() => router.replace("/operator/processing")}>
          Preview the demo plan
        </SecondaryButton>
        <Text style={styles.disclosure}>{mockDisclosure}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, justifyContent: "space-between", paddingBottom: spacing.xxl },
  content: { gap: spacing.xxxl },
  card: { gap: spacing.md },
  cardTitle: { ...typography.heading, color: colors.textPrimary },
  cardCopy: { ...typography.body, color: colors.textSecondary },
  actions: { gap: spacing.sm },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
