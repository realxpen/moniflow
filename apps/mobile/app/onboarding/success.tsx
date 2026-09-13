import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { loadFinancialProvider, providerBadge, type FinancialProviderRuntime } from "@/services/runtime";
import { useDemoSession } from "@/store/demo-session";
import { colors, spacing, typography } from "@/theme";

export default function OnboardingSuccessScreen() {
  const params = useLocalSearchParams<{ localUserId?: string | string[] }>();
  const routedLocalUserId = Array.isArray(params.localUserId) ? params.localUserId[0] : params.localUserId;
  const localUserId = routedLocalUserId?.trim() ?? "";
  const [provider, setProvider] = useState<FinancialProviderRuntime | null>(null);
  const setWorkspace = useDemoSession((state) => state.setWorkspace);

  useEffect(() => {
    let active = true;
    void loadFinancialProvider()
      .then((value) => {
        if (!active) return;
        setProvider(value);
        if (localUserId) setWorkspace(localUserId, value.provider);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [localUserId, setWorkspace]);

  return (
    <Screen contentContainerStyle={styles.screen} scroll={false}>
      <View style={styles.content}>
        <FlowHeader
          description="Your identity, wallet, Nigeria rail, and demo destination can now feed the MONIFlow workspace."
          eyebrow="READY"
          title="Your financial workspace is connected."
        />
        <SoftCard style={styles.card}>
          <StatusPill label={providerBadge(provider)} tone="success" />
          <Text style={styles.cardTitle}>Provider-backed Home is ready.</Text>
          <Text style={styles.cardCopy}>
            MONIFlow reads wallet state, CNGN accounting, Pockets, and Financial Memory from the API. Simulated infrastructure stays visibly labelled and real provider success is never inferred locally.
          </Text>
        </SoftCard>
      </View>
      <PrimaryButton
        disabled={!localUserId || !provider}
        onPress={() => router.replace({ pathname: "/(tabs)/home", params: { localUserId } })}
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
