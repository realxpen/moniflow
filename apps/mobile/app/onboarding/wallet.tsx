import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, Screen } from "@/components/ui";
import { colors, radius, spacing, typography } from "@/theme";

export default function WalletWebPreviewScreen() {
  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />

      <View style={styles.panel}>
        <Text style={styles.eyebrow}>SETTING UP YOUR</Text>
        <Text style={styles.title}>FINANCIAL SPACE</Text>
        <Text style={styles.subtitle}>Creating secure wallet</Text>

        <View style={styles.steps}>
          <PreviewStep label="Device wallet" state="native" />
          <PreviewStep label="Ownership" state="pending" />
          <PreviewStep label="CNGN Wallet" state="pending" />
          <PreviewStep label="Nigerian rail" state="pending" />
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>WEB PREVIEW</Text>
          <Text style={styles.noticeBody}>
            Secure device wallet creation and ownership signing run only inside the MONIFlow
            iOS or Android development build. This browser preview intentionally never creates
            keys or asks for a signing PIN.
          </Text>
        </View>

        <PrimaryButton onPress={() => router.push("/onboarding/success")}>
          Continue preview
        </PrimaryButton>

        <Text style={styles.security}>
          In the native app, private keys remain inside the device secure hardware. MONIFlow
          sends only the owner address and cryptographic signatures to the backend.
        </Text>
      </View>
    </Screen>
  );
}

function PreviewStep({ label, state }: { label: string; state: "native" | "pending" }) {
  return (
    <View style={styles.step}>
      <View style={[styles.dot, state === "native" && styles.dotNative]} />
      <Text style={styles.stepLabel}>{label}</Text>
      <Text style={styles.symbol}>{state === "native" ? "DEVICE" : "○"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
    paddingBottom: spacing.xxl
  },
  glowOne: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.accentSoft,
    top: 40,
    right: -100,
    opacity: 0.8
  },
  glowTwo: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.statusSuccessSoft,
    bottom: 60,
    left: -100,
    opacity: 0.7
  },
  panel: {
    backgroundColor: colors.surfacePrimary,
    borderColor: colors.borderSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl
  },
  eyebrow: {
    ...typography.technical,
    color: colors.textSecondary,
    letterSpacing: 1.4
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    marginTop: -spacing.sm
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary
  },
  steps: {
    gap: spacing.sm,
    marginVertical: spacing.md
  },
  step: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 48
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderColor: colors.textSecondary,
    borderWidth: 1
  },
  dotNative: {
    backgroundColor: colors.statusProcessing,
    borderColor: colors.statusProcessing
  },
  stepLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1
  },
  symbol: {
    ...typography.technical,
    color: colors.textSecondary,
    minWidth: 52,
    textAlign: "right"
  },
  notice: {
    backgroundColor: colors.backgroundPrimary,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  noticeTitle: {
    ...typography.technical,
    color: colors.textPrimary
  },
  noticeBody: {
    ...typography.caption,
    color: colors.textSecondary
  },
  security: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center"
  }
});
