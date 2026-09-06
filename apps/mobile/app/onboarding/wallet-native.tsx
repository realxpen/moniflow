import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, Screen, StatusPill } from "@/components/ui";
import { bmoniDevice } from "@/services/bmoni-device";
import { colors, radius, spacing, typography } from "@/theme";

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
const defaultLocalUserId = process.env.EXPO_PUBLIC_DEV_LOCAL_USER_ID ?? "";

bmoniDevice.initialize({ pinLength: 6, requirePin: true });

type StepState = "idle" | "working" | "done" | "error";
type Step = { label: string; state: StepState };
type PersistedWallet = {
  ownerAddress: string;
  smartWalletAddress: string;
  bmoniSmartWalletId: string;
};

function resolveApiUrl() {
  const raw = configuredApiUrl.trim();
  if (!raw) {
    if (__DEV__) return "http://localhost:4000";
    throw new Error("MONIFlow API URL is not configured for this build.");
  }
  const parsed = new URL(raw);
  if (parsed.username || parsed.password) throw new Error("MONIFlow API URL must not contain credentials.");
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && __DEV__)) {
    throw new Error("MONIFlow API URL must use HTTPS outside development.");
  }
  return raw.replace(/\/$/, "");
}

export default function NativeWalletSetupScreen() {
  const params = useLocalSearchParams<{ localUserId?: string | string[] }>();
  const routedLocalUserId = Array.isArray(params.localUserId) ? params.localUserId[0] : params.localUserId;
  const localUserId = routedLocalUserId?.trim() || defaultLocalUserId;

  const [pin, setPin] = useState("");
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [smartWalletAddress, setSmartWalletAddress] = useState<string | null>(null);
  const [providerWalletStatus, setProviderWalletStatus] = useState<string | null>(null);
  const [providerBalance, setProviderBalance] = useState<string | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [states, setStates] = useState<Record<string, StepState>>({
    device: "idle",
    ownership: "idle",
    cngn: "idle",
    readback: "idle",
    rail: "idle"
  });

  const steps: Step[] = useMemo(() => [
    { label: "Device wallet", state: states.device },
    { label: "Owner proof", state: states.ownership },
    { label: "Managed CNGN wallet", state: states.cngn },
    { label: "BMONI readback", state: states.readback },
    { label: "Nigeria rail", state: states.rail }
  ], [states]);

  const update = (key: string, state: StepState) => setStates((current) => ({ ...current, [key]: state }));

  const refreshProvider = async (apiUrl: string) => {
    if (!localUserId) return;
    update("readback", "working");
    try {
      const walletResponse = await fetch(`${apiUrl}/api/wallet?localUserId=${encodeURIComponent(localUserId)}`);
      const walletPayload = (await walletResponse.json()) as { wallet?: { status?: string; address?: string }; message?: string };
      if (!walletResponse.ok || !walletPayload.wallet) throw new Error(walletPayload.message ?? "BMONI wallet readback failed.");
      setProviderWalletStatus(walletPayload.wallet.status ?? "unknown");
      if (walletPayload.wallet.address) setSmartWalletAddress(walletPayload.wallet.address);

      const balanceResponse = await fetch(`${apiUrl}/api/wallet/balance?localUserId=${encodeURIComponent(localUserId)}`);
      const balancePayload = (await balanceResponse.json()) as { balance?: { amount?: string }; message?: string };
      if (!balanceResponse.ok || !balancePayload.balance?.amount) {
        throw new Error(balancePayload.message ?? "BMONI balance readback failed.");
      }
      setProviderBalance(balancePayload.balance.amount);
      update("readback", "done");
    } catch (cause) {
      update("readback", "error");
      throw cause;
    }
  };

  const restorePersistedWallet = async (apiUrl: string) => {
    if (!localUserId) return false;
    const response = await fetch(`${apiUrl}/api/wallet/status?localUserId=${encodeURIComponent(localUserId)}`);
    const payload = (await response.json()) as { status?: string; wallet?: PersistedWallet; message?: string };
    if (!response.ok) throw new Error(payload.message ?? "Wallet status could not be loaded.");
    if (payload.status !== "created" || !payload.wallet) return false;

    if (!bmoniDevice.available) throw new Error("The managed wallet exists, but secure device signing is unavailable in this build.");
    if (!(await bmoniDevice.hasWallet())) {
      throw new Error("A managed BMONI wallet is already linked, but this device no longer has its owner key. Do not create a replacement key for this identity.");
    }
    const deviceAddress = await bmoniDevice.walletAddress();
    if (!deviceAddress || deviceAddress.toLowerCase() !== payload.wallet.ownerAddress.toLowerCase()) {
      throw new Error("This device owner key does not match the owner address already bound to the managed BMONI wallet.");
    }

    setOwnerAddress(payload.wallet.ownerAddress);
    setSmartWalletAddress(payload.wallet.smartWalletAddress);
    setPersisted(true);
    setStates((current) => ({ ...current, device: "done", ownership: "done", cngn: "done" }));
    await refreshProvider(apiUrl);
    return true;
  };

  useEffect(() => {
    if (!localUserId) return;
    let active = true;
    const restore = async () => {
      setBusy(true);
      setError(null);
      try {
        const apiUrl = resolveApiUrl();
        const restored = await restorePersistedWallet(apiUrl);
        if (!active) return;
        if (!restored) setStates((current) => ({ ...current, device: "idle", ownership: "idle", cngn: "idle", readback: "idle" }));
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Existing wallet state could not be verified.");
      } finally {
        if (active) setBusy(false);
      }
    };
    void restore();
    return () => { active = false; };
    // localUserId is the identity boundary for this screen.
  }, [localUserId]);

  const provision = async () => {
    if (!bmoniDevice.available) {
      setError("BMONI device signing is unavailable in this build.");
      return;
    }
    if (!localUserId) {
      setError("Your MONIFlow identity link is missing. Return to Identity and continue again.");
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError("Enter a 6-digit device signing PIN.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const apiUrl = resolveApiUrl();
      if (await restorePersistedWallet(apiUrl)) return;

      update("device", "working");
      const address = (await bmoniDevice.hasWallet())
        ? await bmoniDevice.walletAddress()
        : await bmoniDevice.initWallet();
      if (!address) throw new Error("BMONI did not return a device wallet address.");

      if (await bmoniDevice.hasPin()) {
        if (!(await bmoniDevice.matchPin(pin))) throw new Error("The PIN does not match this device wallet.");
      } else {
        await bmoniDevice.setPin(pin);
      }
      setOwnerAddress(address);
      update("device", "done");

      update("ownership", "working");
      const challengeResponse = await fetch(`${apiUrl}/api/wallet/owner-proof-challenge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ localUserId, ownerAddress: address })
      });
      const challenge = (await challengeResponse.json()) as { challengeId?: string; message?: string; code?: string; messageText?: string };
      if (!challengeResponse.ok || !challenge.challengeId || !challenge.message) {
        if (challenge.code === "WALLET_ALREADY_CREATED" && await restorePersistedWallet(apiUrl)) return;
        throw new Error(challenge.message ?? challenge.messageText ?? "Ownership challenge could not be created.");
      }

      // Owner proof is EIP-191 text signing. Proposal execution later uses
      // signTransactionHash and never reuses this signature method.
      const signature = await bmoniDevice.signMessage(challenge.message, pin);
      update("ownership", "done");

      update("cngn", "working");
      const walletResponse = await fetch(`${apiUrl}/api/wallet/create-managed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ localUserId, ownerAddress: address, challengeId: challenge.challengeId, signature })
      });
      const walletPayload = (await walletResponse.json()) as {
        status?: "created" | "existing";
        wallet?: PersistedWallet;
        message?: string;
      };
      if (!walletResponse.ok || !walletPayload.wallet?.smartWalletAddress) {
        throw new Error(walletPayload.message ?? "CNGN smart wallet could not be created.");
      }
      if (walletPayload.wallet.ownerAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error("Persisted managed-wallet owner does not match this device owner key.");
      }

      setPin("");
      setSmartWalletAddress(walletPayload.wallet.smartWalletAddress);
      setPersisted(true);
      update("cngn", "done");
      update("rail", "idle");
      await refreshProvider(apiUrl);
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
        <Text style={styles.eyebrow}>REAL BMONI SANDBOX</Text>
        <Text style={styles.title}>SECURE WALLET</Text>
        <Text style={styles.subtitle}>Device key → owner proof → managed CNGN → provider readback</Text>

        <View style={styles.steps}>
          {steps.map((step) => <ProvisionStep key={step.label} {...step} />)}
        </View>

        {!persisted ? (
          <View style={styles.fields}>
            <Text style={styles.identityLinked}>MONIFlow identity linked automatically</Text>
            <TextInput
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(value) => setPin(value.replace(/\D/g, ""))}
              placeholder="6-digit signing PIN"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              style={styles.input}
              value={pin}
            />
          </View>
        ) : null}

        {ownerAddress ? <Text style={styles.address}>Owner · {ownerAddress}</Text> : null}
        {smartWalletAddress ? <Text style={styles.address}>CNGN · {smartWalletAddress}</Text> : null}
        {providerWalletStatus ? <StatusPill label={`BMONI · ${providerWalletStatus.toUpperCase()}`} tone={providerWalletStatus === "active" ? "success" : "processing"} /> : null}
        {providerBalance !== null ? <Text style={styles.balance}>Provider CNGN balance · {providerBalance}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {persisted ? (
          <PrimaryButton onPress={() => router.push({ pathname: "/onboarding/nigeria", params: { localUserId } })}>
            Continue to Nigeria KYC
          </PrimaryButton>
        ) : (
          <PrimaryButton disabled={busy || !localUserId} onPress={() => void provision()}>
            {busy ? "Checking BMONI…" : "Create secure wallet"}
          </PrimaryButton>
        )}
        <Text style={styles.security}>
          Private keys and PINs never leave this device. MONIFlow sends only the owner address and cryptographic signatures to its backend.
        </Text>
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
  identityLinked: { ...typography.caption, color: colors.statusSuccess },
  input: { ...typography.body, minHeight: 52, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceGlass, color: colors.textPrimary, paddingHorizontal: spacing.md },
  address: { ...typography.technical, color: colors.textSecondary },
  balance: { ...typography.body, color: colors.textPrimary },
  error: { ...typography.caption, color: colors.statusError },
  security: { ...typography.caption, color: colors.textSecondary, textAlign: "center" }
});
