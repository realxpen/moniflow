import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { ProgressStep } from "@/components/operator";
import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { getExecutionReadiness } from "@/services/approval";
import { bmoniDevice } from "@/services/bmoni-device";
import { prepareExecution, submitExecutionSignature, type ExecutionSnapshot } from "@/services/execution";
import { colors, radius, spacing, typography } from "@/theme";

bmoniDevice.initialize({ pinLength: 6, requirePin: true });

export default function SigningScreen() {
  const params = useLocalSearchParams<{ localUserId?: string; planId?: string }>();
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const planId = typeof params.planId === "string" ? params.planId : "";
  const [execution, setExecution] = useState<ExecutionSnapshot | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const prepare = async () => {
      if (!localUserId || !planId) {
        setError("A persisted approved plan is required before device signing.");
        setLoading(false);
        return;
      }
      try {
        const readiness = await getExecutionReadiness(planId, localUserId);
        if (!readiness.canExecute || !readiness.approvalHashMatches) {
          throw new Error(readiness.message ?? "This plan is not approved for execution.");
        }
        const next = await prepareExecution(planId, localUserId);
        if (active) setExecution(next);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Execution preparation failed.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void prepare();
    return () => { active = false; };
  }, [localUserId, planId]);

  const sign = async () => {
    if (!execution?.hashToSign || execution.state !== "AWAITING_DEVICE_SIGNATURE") return;
    if (!bmoniDevice.available) {
      setError("Raw BMONI proposal signing requires the iOS or Android development build; web and Expo Go cannot access the secure device wallet.");
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError("Enter your 6-digit device signing PIN.");
      return;
    }

    setSigning(true);
    setError(null);
    try {
      // BMONI proposal signing is deliberately NOT signMessage/EIP-191.
      // hashToSign is the provider's raw 32-byte digest and must use signTransactionHash.
      const signature = await bmoniDevice.signTransactionHash(execution.hashToSign, pin);
      setPin("");
      const next = await submitExecutionSignature(planId, localUserId, execution.proposalId, signature);
      setExecution(next);
      router.replace({ pathname: "/operator/execution", params: { localUserId, planId } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Secure signing or provider submission failed.");
    } finally {
      setSigning(false);
    }
  };

  const readyToSign = execution?.state === "AWAITING_DEVICE_SIGNATURE" && Boolean(execution.hashToSign);

  return (
    <Screen contentContainerStyle={styles.screen}>
      <FlowHeader
        description="The approved plan has been mapped to a real BMONI Nigerian offramp proposal. Your device signs only BMONI's raw 32-byte proposal digest."
        eyebrow="SECURE SIGNING"
        title="Your key never leaves this device."
      />

      <SoftCard style={styles.card}>
        <StatusPill
          label={loading ? "PREPARING PROPOSAL" : readyToSign ? "AWAITING DEVICE SIGNATURE" : execution?.state ?? "BLOCKED"}
          tone={loading ? "processing" : readyToSign ? "warning" : execution?.state === "COMPLETED" ? "success" : "processing"}
        />
        <Text style={styles.cardTitle}>
          {readyToSign ? `${formatNaira(execution?.amount ?? 0)} proposal ready for secure signing.` : "Preparing the BMONI execution boundary."}
        </Text>
        <Text style={styles.cardCopy}>
          {readyToSign
            ? "MONIFlow never receives your PIN or private key. The signature returned by the BMONI SDK is submitted to the provider for this exact proposal only."
            : error ?? "Creating or recovering the idempotent BMONI proposal…"}
        </Text>
      </SoftCard>

      <View style={styles.steps}>
        <ProgressStep index={1} state="complete" title="MONI Guard + approval" detail="Persisted approved plan fingerprint verified" />
        <ProgressStep index={2} state={execution ? "complete" : "active"} title="BMONI proposal" detail={execution ? `Proposal ${shortId(execution.proposalId)}` : "Creating Nigerian offramp proposal"} />
        <ProgressStep index={3} state={readyToSign ? "active" : "pending"} title="Secure device signature" detail="Raw 32-byte hash · no EIP-191 prefix" />
        <ProgressStep index={4} state="pending" title="Provider processing" detail="BMONI status drives the result" />
      </View>

      {readyToSign ? (
        <SoftCard style={styles.pinCard}>
          <Text style={styles.micro}>DEVICE SIGNING PIN</Text>
          <TextInput
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={(value) => setPin(value.replace(/\D/g, ""))}
            placeholder="••••••"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            style={styles.pinInput}
            value={pin}
          />
          <PrimaryButton disabled={signing || pin.length !== 6} onPress={() => void sign()}>
            {signing ? "Signing securely…" : `Sign ${formatNaira(execution.amount)} proposal`}
          </PrimaryButton>
        </SoftCard>
      ) : null}

      {error ? (
        <SoftCard style={styles.errorCard}>
          <StatusPill label="EXECUTION BLOCKED" tone="warning" />
          <Text style={styles.error}>{error}</Text>
        </SoftCard>
      ) : null}

      <Text style={styles.disclosure}>Owner-proof text signing and proposal-hash signing remain separate. This screen only uses signTransactionHash.</Text>
    </Screen>
  );
}

function formatNaira(amount: number) {
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
}
function shortId(value: string) { return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value; }

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.backgroundSecondary, gap: spacing.md },
  cardTitle: { ...typography.heading, color: colors.textPrimary },
  cardCopy: { ...typography.body, color: colors.textSecondary },
  steps: { gap: spacing.xs },
  pinCard: { gap: spacing.md },
  micro: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.2 },
  pinInput: { ...typography.display, backgroundColor: colors.backgroundPrimary, borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, color: colors.textPrimary, letterSpacing: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.md, textAlign: "center" },
  errorCard: { gap: spacing.sm },
  error: { ...typography.body, color: colors.statusError },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
