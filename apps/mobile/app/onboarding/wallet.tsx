import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { colors, radius, spacing, typography } from "@/theme";

const setupRows = [
  ["DEVICE WALLET", "Secure wallet actions will remain on this device."],
  ["OWNERSHIP", "Ownership proof will use the verified BMONI SDK."],
  ["CNGN", "Provider capability will appear only after sandbox setup."]
] as const;

export default function WalletSetupScreen() {
  return (
    <Screen contentContainerStyle={styles.screen} scroll={false}>
      <View style={styles.content}>
        <FlowHeader
          description="The device-side ownership boundary is reserved without installing or mocking the BMONI SDK."
          eyebrow="02 · WALLET PREVIEW"
          title="A wallet you control."
        />
        <SoftCard style={styles.card}>
          {setupRows.map(([label, copy], index) => (
            <View key={label}>
              <View style={styles.row}>
                <View style={styles.index}>
                  <Text style={styles.indexLabel}>{String(index + 1).padStart(2, "0")}</Text>
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.meta}>{copy}</Text>
                </View>
              </View>
              {index < setupRows.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </SoftCard>
        <StatusPill label="NOT PROVISIONED" tone="warning" />
      </View>
      <PrimaryButton onPress={() => router.push("/onboarding/success")}>
        Continue static setup
      </PrimaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, justifyContent: "space-between", paddingBottom: spacing.xxl },
  content: { gap: spacing.xxxl },
  card: { gap: spacing.md },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  index: {
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  indexLabel: { ...typography.technical, color: colors.statusProcessing },
  rowCopy: { flex: 1, gap: spacing.xxs },
  label: { ...typography.technical, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary },
  divider: { backgroundColor: colors.borderSoft, height: 1, marginTop: spacing.md }
});
