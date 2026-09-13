import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import {
  loadFinancialProvider,
  providerBadge,
  resetSandboxDemo,
  type FinancialProviderRuntime
} from "@/services/runtime";
import { colors, spacing, typography } from "@/theme";

export default function WelcomeScreen() {
  const [provider, setProvider] = useState<FinancialProviderRuntime | null>(null);
  const [checking, setChecking] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProvider = async () => {
    setChecking(true);
    setError(null);
    try {
      setProvider(await loadFinancialProvider());
    } catch (cause) {
      setProvider(null);
      setError(cause instanceof Error ? cause.message : "Financial provider could not be reached.");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { void refreshProvider(); }, []);

  const startCleanDemo = async () => {
    setPreparing(true);
    setError(null);
    try {
      const state = await resetSandboxDemo();
      router.replace({
        pathname: "/onboarding/success",
        params: { localUserId: state.identity.localUserId, provider: state.provider.id }
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sandbox demo could not be prepared.");
    } finally {
      setPreparing(false);
    }
  };

  const sandboxDemo = provider?.provider === "moniflow-sandbox";

  return (
    <Screen contentContainerStyle={styles.screen} scroll={false}>
      <View style={styles.top}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>MONIFlow</Text>
          <StatusPill
            label={checking ? "CHECKING PROVIDER" : error && !provider ? "PROVIDER OFFLINE" : providerBadge(provider)}
            tone={checking ? "processing" : error && !provider ? "warning" : provider?.simulated ? "processing" : "success"}
          />
        </View>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>MONEY, OPERATED INTELLIGENTLY</Text>
          <Text style={styles.title}>Your financial operator.</Text>
          <Text style={styles.description}>
            Describe the outcome. MONIFlow prepares a clear plan, checks it with MONI Guard, and leaves consequential movement under human approval.
          </Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <SoftCard style={styles.principleCard}>
          <Text style={styles.principleLabel}>THE OPERATING PRINCIPLE</Text>
          <Text style={styles.principle}>Intent → Plan → Guard → Human approval</Text>
          <Text style={styles.providerCopy}>
            {provider
              ? `${provider.label} · ${provider.environment}${provider.simulated ? " · simulated financial infrastructure" : ""}`
              : "MONIFlow will not guess provider state when the API is unavailable."}
          </Text>
        </SoftCard>

        {sandboxDemo ? (
          <PrimaryButton disabled={preparing || checking} onPress={() => void startCleanDemo()}>
            {preparing ? "Preparing clean demo…" : "Start clean sandbox demo"}
          </PrimaryButton>
        ) : (
          <PrimaryButton disabled={checking || !provider} onPress={() => router.push("/onboarding/identity")}>
            Begin secure setup
          </PrimaryButton>
        )}

        {error ? (
          <View style={styles.errorBlock}>
            <Text style={styles.error}>{error}</Text>
            <SecondaryButton disabled={checking} onPress={() => void refreshProvider()}>
              Retry provider check
            </SecondaryButton>
          </View>
        ) : null}

        <Text style={styles.disclosure}>
          {sandboxDemo
            ? "SANDBOX DEMO USES A FRESH SIMULATED IDENTITY; THE BMONI NATIVE ONBOARDING PATH IS NOT BYPASSED WHEN BMONI IS ACTIVE"
            : "REAL PROVIDER SUCCESS IS NEVER INFERRED FROM LOCAL UI STATE"}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "space-between", paddingBottom: spacing.xxl, paddingTop: spacing.xl },
  top: { gap: spacing.giant },
  brandRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  brand: { ...typography.section, color: colors.textPrimary },
  hero: { gap: spacing.md },
  eyebrow: { ...typography.technical, color: colors.statusProcessing },
  title: { ...typography.hero, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary, maxWidth: 430 },
  bottom: { gap: spacing.md },
  principleCard: { gap: spacing.xs, padding: spacing.lg },
  principleLabel: { ...typography.technical, color: colors.textSecondary },
  principle: { ...typography.section, color: colors.textPrimary },
  providerCopy: { ...typography.caption, color: colors.textSecondary },
  errorBlock: { gap: spacing.sm },
  error: { ...typography.caption, color: colors.statusError, textAlign: "center" },
  disclosure: { ...typography.technical, color: colors.textSecondary, fontSize: 9, textAlign: "center" }
});
