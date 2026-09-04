import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { colors, spacing, typography } from "@/theme";

export default function OnboardingSuccessScreen() {
  return (
    <Screen contentContainerStyle={styles.screen} scroll={false}>
      <View style={styles.content}>
        <FlowHeader
          description="The navigation shell is ready to explore. Real identity and wallet setup remain later phases."
          eyebrow="03 · SETUP PREVIEW"
          title="Your workspace is ready to preview."
        />
        <SoftCard style={styles.card}>
          <StatusPill label="SHELL READY" tone="success" />
          <Text style={styles.cardTitle}>Nothing financial happened.</Text>
          <Text style={styles.cardCopy}>
            No BMONI user, wallet, KYC record, or provider balance was created. Every value ahead is
            clearly marked mock data.
          </Text>
        </SoftCard>
      </View>
      <PrimaryButton onPress={() => router.replace("/(tabs)/home")}>
        Enter MONIFlow
      </PrimaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, justifyContent: "space-between", paddingBottom: spacing.xxl },
  content: { gap: spacing.xxxl },
  card: { gap: spacing.md },
  cardTitle: { ...typography.heading, color: colors.textPrimary },
  cardCopy: { ...typography.body, color: colors.textSecondary }
});
