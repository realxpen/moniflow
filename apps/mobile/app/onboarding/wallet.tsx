import { BmoniEmbeddedSdk } from "@bkey-inc/bmoni_embedded_sdk";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, Screen } from "@/components/ui";
import { colors, radius, spacing, typography } from "@/theme";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const defaultLocalUserId = process.env.EXPO_PUBLIC_DEV_LOCAL_USER_ID ?? "";

BmoniEmbeddedSdk.initialize({ pinLength: 6, requirePin: true });

type StepState = "idle" | "working" | "done" | "error";
type Step = { label: string; state: StepState };

export default function WalletSetupScreen() {
  const [localUserId, setLocalUserId] = useState(defaultLocalUserId);
  const [pin, setPin] = useState("");
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [smartWalletAddress, setSmartWalletAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [states, setStates] = useState<Record<string, StepState>>({
    device: "idle", ownership: "idle", cngn: "idle", rail: "idle"
  });

  const steps: Step[] = useMemo(() => [
    { label: "Device wallet", state: states.device },
    { label: "Ownership", state: states.ownership },
    { label: "CNGN Wallet", state: states.cngn },
    { label: "Nigerian rail", state: states.rail }
  ], [states]);

  const update = (key: string, state: StepState) => setStates((current) => ({ ...current, [key]: state }));

  const provision = async () => {
    if (Platform.OS === "web") {
      setError("BMONI device signing requires the iOS or Android development build.");
      return;
    }
    if (!localUserId.trim() || pin.length !== 6) {
      setError("Enter the local user UUID from Phase 4 and a 6-digit device signing PIN.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      update("device", "working");
      const address = (await BmoniEmbeddedSdk.walletAddress()) ?? (await BmoniEmbeddedSdk.initWallet());
      if (!(await BmoniEmbeddedSdk.hasPin())) await BmoniEmbeddedSdk.setPin(pin);
      setOwnerAddress(address);
      update("device", "done");

      update("ownership", "working");
      const challengeResponse = await fetch(`${apiUrl}/api/wallet/owner-proof-challenge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ localUserId: localUserId.trim(), ownerAddress: address })
      });
      const challenge = await challengeResponse.json() as { challengeId?: string; message?: string };
      if (!challengeResponse.ok || !challenge.challengeId || !challenge.message) throw new Error("Ownership challenge could not be created.");

      const signature = await BmoniEmbeddedSdk.signMessage(challenge.message, pin);
      setPin("");
      update("ownership", "done");

      update("cngn", "working");
      const walletResponse = await fetch(`${apiUrl}/api/wallet/create-managed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ localUserId: localUserId.trim(), ownerAddress: address, challengeId: challenge.challengeId, signature })
      });
      const walletPayload = await walletResponse.json() as { wallet?: { smartWalletAddress?: string } };
      if (!walletResponse.ok || !walletPayload.wallet?.smartWalletAddress) throw new Error("CNGN smart wallet could not be created.");
      setSmartWalletAddress(walletPayload.wallet.smartWalletAddress);
      update("cngn", "done");
      update("rail", "idle");
    } catch (cause) {
      setPin("");
      setError(cause instanceof Error ? cause.message : "Wallet provisioning failed safely.");
      setStates((current) => {
        const active = Object.entries(current).find(([, state]) => state === "working")?.[0];
        return active ? { ...current, [active]: "error" } : current;
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <BlurView intensity={38} tint="light" style={styles.panel}>
        <Text style={styles.eyebrow}>SETTING UP YOUR</Text>
        <Text style={styles.title}>FINANCIAL SPACE</Text>
        <Text style={styles.subtitle}>Creating secure wallet</Text>

        <View style={styles.steps}>
          {steps.map((step) => <ProvisionStep key={step.label} {...step} />)}
        </View>

        <View style={styles.fields}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setLocalUserId}
            placeholder="Phase 4 local user UUID"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            value={localUserId}
          />
          <TextInput
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setPin}
            placeholder="6-digit signing PIN"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            style={styles.input}
            value={pin}
          />
        </View>

        {ownerAddress ? <Text style={styles.address}>Owner · {ownerAddress}</Text> : null}
        {smartWalletAddress ? <Text style={styles.address}>CNGN · {smartWalletAddress}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {smartWalletAddress ? (
          <PrimaryButton onPress={() => router.push("/onboarding/success")}>Continue</PrimaryButton>
        ) : (
          <PrimaryButton disabled={busy} onPress={() => void provision()}>{busy ? "Provisioning…" : "Create secure wallet"}</PrimaryButton>
        )}
        <Text style={styles.security}>Private keys never leave this device. MONIFlow sends only the owner address and cryptographic signatures to the backend.</Text>
      </BlurView>
    </Screen>
  );
}

function ProvisionStep({ label, state }: Step) {
  const symbol = state === "done" ? "✓" : state === "working" ? "•••" : state === "error" ? "!" : "○";
  return (
    <View style={styles.step}>
      <View style={[styles.dot, state === "done" && styles.dotDone, state === "working" && styles.dotWorking]} />
      <Text style={styles.stepLabel}>{label}</Text>
      <Text style={[styles.symbol, state === "done" && styles.symbolDone]}>{symbol}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", overflow: "hidden", paddingBottom: spacing.xxl },
  glowOne: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: colors.accentSoft, top: 40, right: -100, opacity: 0.8 },
  glowTwo: { position: "absolute", width: 240, height: 240, borderRadius: 120, backgroundColor: colors.statusSuccessSoft, bottom: 60, left: -100, opacity: 0.7 },
  panel: { borderColor: colors.borderInverseSoft, borderRadius: radius.card, borderWidth: 1, gap: spacing.lg, overflow: "hidden", padding: spacing.xl },
  eyebrow: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.4 },
  title: { ...typography.display, color: colors.textPrimary, marginTop: -spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary },
  steps: { gap: spacing.sm, marginVertical: spacing.md },
  step: { alignItems: "center", flexDirection: "row", minHeight: 48, gap: spacing.md },
  dot: { width: 9, height: 9, borderRadius: 5, borderColor: colors.textSecondary, borderWidth: 1 },
  dotDone: { backgroundColor: colors.statusSuccess, borderColor: colors.statusSuccess },
  dotWorking: { backgroundColor: colors.statusProcessing, borderColor: colors.statusProcessing },
  stepLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  symbol: { ...typography.body, color: colors.textSecondary, minWidth: 28, textAlign: "right" },
  symbolDone: { color: colors.statusSuccess, fontWeight: "700" },
  fields: { gap: spacing.sm },
  input: { ...typography.body, minHeight: 52, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceGlass, color: colors.textPrimary, paddingHorizontal: spacing.md },
  address: { ...typography.technical, color: colors.textSecondary },
  error: { ...typography.caption, color: colors.statusError },
  security: { ...typography.caption, color: colors.textSecondary, textAlign: "center" }
});
