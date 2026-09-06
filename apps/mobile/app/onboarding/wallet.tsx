import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, Screen, StatusPill } from "@/components/ui";
import { colors, radius, spacing, typography } from "@/theme";

export default function WalletWebBoundaryScreen() {
  const params = useLocalSearchParams<{ localUserId?: string | string[] }>();
  const routedLocalUserId = Array.isArray(params.localUserId) ? params.localUserId[0] : params.localUserId;
  const localUserId = routedLocalUserId?.trim() ?? "";

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />

      <View style={styles.panel}>
        <Text style={styles.eyebrow}>SECURE WALLET BOUNDARY</Text>
        <Text style={styles.title}>NATIVE BUILD REQUIRED</Text>
        <Text style={styles.subtitle}>The real BMONI device wallet cannot be created in the web preview.</Text>

        <View style={styles.steps}>
          <BoundaryStep label="BMONI identity" state={localUserId ? "done" : "blocked"} />
          <BoundaryStep label="Device wallet" state="native" />
          <BoundaryStep label="Owner-proof signature" state="native" />
          <BoundaryStep label="Managed CNGN wallet" state="native" />
          <BoundaryStep label="Nigeria KYC" state="blocked" />
        </View>

        <View style={styles.notice}>
          <StatusPill label="NO WEB BYPASS" tone="warning" />
          <Text style={styles.noticeBody}>
            Continue this identity in the iOS or Android development build. MONIFlow will not advance to Nigeria KYC until the BMONI SDK creates the device wallet, signs the owner-proof challenge, and the backend persists the real managed CNGN wallet.
          </Text>
        </View>

        <PrimaryButton disabled onPress={() => undefined}>
          Open in native development build
        </PrimaryButton>

        <Text style={styles.security}>
          Private keys and the signing PIN remain on-device. The web build never substitutes a preview wallet or simulated signature.
        </Text>
      </View>
    </Screen>
  );
}

function BoundaryStep({ label, state }: { label: string; state: "done" | "native" | "blocked" }) {
  return (
    <View style={styles.step}>
      <View style={[styles.dot, state === "done" && styles.dotDone, state === "native" && styles.dotNative]} />
      <Text style={styles.stepLabel}>{label}</Text>
      <Text style={styles.symbol}>{state === "done" ? "✓" : state === "native" ? "DEVICE" : "LOCKED"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", overflow: "hidden", paddingBottom: spacing.xxl },
  glowOne: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: colors.accentSoft, top: 40, right: -100, opacity: 0.8 },
  glowTwo: { position: "absolute", width: 240, height: 240, borderRadius: 120, backgroundColor: colors.statusSuccessSoft, bottom: 60, left: -100, opacity: 0.7 },
  panel: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: radius.card, borderWidth: 1, gap: spacing.lg, padding: spacing.xl },
  eyebrow: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.4 },
  title: { ...typography.display, color: colors.textPrimary, marginTop: -spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary },
  steps: { gap: spacing.sm, marginVertical: spacing.md },
  step: { alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 48 },
  dot: { width: 9, height: 9, borderRadius: 5, borderColor: colors.textSecondary, borderWidth: 1 },
  dotDone: { backgroundColor: colors.statusSuccess, borderColor: colors.statusSuccess },
  dotNative: { backgroundColor: colors.statusProcessing, borderColor: colors.statusProcessing },
  stepLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  symbol: { ...typography.technical, color: colors.textSecondary, minWidth: 62, textAlign: "right" },
  notice: { backgroundColor: colors.backgroundPrimary, borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  noticeBody: { ...typography.caption, color: colors.textSecondary },
  security: { ...typography.caption, color: colors.textSecondary, textAlign: "center" }
});
