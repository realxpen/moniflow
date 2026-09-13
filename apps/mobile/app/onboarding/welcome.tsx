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
import { useDemoSession } from "@/store/demo-session";
import { colors, spacing, typography } from "@/theme";

export default function WelcomeScreen() {
  const [provider, setProvider] = useState<FinancialProviderRuntime | null>(null);
  const [checking, setChecking] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useDemoSession((state) => state.hydrated);
  const savedLocalUserId = useDemoSession((state) => state.localUserId);
  const savedProvider = useDemoSession((state) => state.provider);
  const savedStage = useDemoSession((state) => state.stage);
  const setWorkspace = useDemoSession((state) => state.setWorkspace);

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
      setWorkspace(state.identity.localUserId, state.provider.id);
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
  const canResume = Boolean(
    hydrated &&
    savedLocalUserId &&
    provider &&
    savedProvider === provider.provider
  );

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

        {canResume ? (
          <SoftCard style={styles.resumeCard}>
            <View style={styles.resumeCopy}>
              <StatusPill label="WORKSPACE SAVED" tone="success" />
              <Text style={styles.resumeTitle}>Resume your current workspace.</Text>
              <Text style={styles.providerCopy}>
                {savedStage && savedStage !== "home"
                  ? "An unfinished flow is saved. MONIFlow returns you to Home first so you choose when to continue it."
                  : "Your last demo identity is still available on this device."}
              </Text>
            </View>
            <PrimaryButton
              onPress={() => router.replace({ pathname: "/(tabs)/home", params: { localUserId: savedLocalUserId } })}
            >
              Resume workspace
            </PrimaryButton>
          </SoftCard>
        ) : null}

        {sandboxDemo ? (
          <SecondaryButton disabled={preparing || checking} onPress={() => void startCleanDemo()}>
            {preparing ? "Preparing clean demo…" : canResume ? "Restart with a clean sandbox demo" : "Start clean sandbox demo"}
          </SecondaryButton>
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
            ? "ONLY NON-SECRET WORKSPACE CONTEXT IS SAVED ON DEVICE; SANDBOX FINANCIAL INFRASTRUCTURE REMAINS SIMULATED"
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
  resumeCard: { gap: spacing.md },
  resumeCopy: { gap: spacing.sm },
  resumeTitle: { ...typography.heading, color: colors.textPrimary },
  errorBlock: { gap: spacing.sm },
  error: { ...typography.caption, color: colors.statusError, textAlign: "center" },
  disclosure: { ...typography.technical, color: colors.textSecondary, fontSize: 9, textAlign: "center" }
});
