import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { colors, spacing, typography } from "@/theme";

export default function OnboardingSuccessScreen() {
  const params = useLocalSearchParams<{ localUserId?: string | string[] }>();
  const routedLocalUserId = Array.isArray(params.localUserId) ? params.localUserId[0] : params.localUserId;
  const localUserId = routedLocalUserId?.trim() ?? "";

  return (
    <Screen contentContainerStyle={styles.screen} scroll={false}>
      <View style={styles.content}>
        <FlowHeader
          description="Your sandbox identity, wallet, and Nigeria rail can now feed the MONIFlow wallet home."
          eyebrow="READY"
          title="Your financial workspace is connected."
        />
        <SoftCard style={styles.card}>
          <StatusPill label="SANDBOX READY" tone="success" />
          <Text style={styles.cardTitle}>Provider-backed Home is ready.</Text>
          <Text style={styles.cardCopy}>
            MONIFlow will read wallet state, CNGN balance, and the NGN deposit account from the BMONI sandbox where available. Technical wallet identifiers stay behind the wallet detail view.
          </Text>
        </SoftCard>
      </View>
      <PrimaryButton
        onPress={() =>
          router.replace({
            pathname: "/(tabs)/home",
            params: localUserId ? { localUserId } : undefined
          })
        }
      >
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
