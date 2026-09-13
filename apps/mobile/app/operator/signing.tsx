import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { ProgressStep } from "@/components/operator";
import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { getExecutionReadiness } from "@/services/approval";
import { bmoniDevice } from "@/services/bmoni-device";
import {
  getExecutionStatus,
  prepareExecution,
  submitExecutionSignature,
  type ExecutionSnapshot
} from "@/services/execution";
import {
  loadFinancialProvider,
  providerBadge,
  providerName,
  type FinancialProviderRuntime
} from "@/services/runtime";
import { colors, radius, spacing, typography } from "@/theme";

const sandboxSignature = `0x${"22".repeat(65)}`;

export default function SigningScreen() {
  const params = useLocalSearchParams<{ localUserId?: string; planId?: string }>();
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const planId = typeof params.planId === "string" ? params.planId : "";
  const [provider, setProvider] = useState<FinancialProviderRuntime | null>(null);
  const [execution, setExecution] = useState<ExecutionSnapshot | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const prepare = async () => {
      if (!localUserId || !planId) {
        setError("A persisted approved plan is required before secure execution.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [runtime, readiness] = await Promise.all([
          loadFinancialProvider(),
          getExecutionReadiness(planId, localUserId)
        ]);
        if (!readiness.canExecute || !readiness.approvalHashMatches) {
          throw new Error(readiness.message ?? "This plan is not approved for execution.");
        }
        const next = await prepareExecution(planId, localUserId);
        if (!active) return;
        setProvider(runtime);
        setExecution(next);
        if (next.state === "PROCESSING") {
          router.replace({ pathname: "/operator/execution", params: { localUserId, planId } });
        } else if (next.state === "COMPLETED" || next.state === "FAILED") {
          router.replace({ pathname: "/operator/result", params: { localUserId, planId } });
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Execution preparation failed.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void prepare();
    return () => { active = false; };
  }, [localUserId, planId]);

  useEffect(() => {
    if (!localUserId || !planId || execution?.state !== "PREPARING") return;
    let active = true;
    const refresh = async () => {
      try {
        const next = await getExecutionStatus(planId, localUserId);
        if (!active) return;
        setExecution(next);
        setError(null);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not refresh provider proposal readiness.");
      }
    };
    const timer = setInterval(() => { void refresh(); }, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [execution?.state, localUserId, planId]);

  const sign = async () => {
    if (!execution?.hashToSign || execution.state !== "AWAITING_DEVICE_SIGNATURE" || !provider) return;
    const simulated = provider.provider === "moniflow-sandbox";

    if (!simulated) {
      if (!bmoniDevice.available) {
        setError("BMONI proposal signing requires the iOS or Android development build; web and Expo Go cannot access the secure device wallet.");
        return;
      }
      if (!/^\d{6}$/.test(pin)) {
        setError("Enter your 6-digit device signing PIN.");
        return;
      }
    }

    setSigning(true);
    setError(null);
    try {
      const signature = simulated
        ? sandboxSignature
        : await bmoniDevice.signTransactionHash(execution.hashToSign, pin);
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

  const waitingForProvider = execution?.state === "PREPARING";
  const readyToSign = execution?.state === "AWAITING_DEVICE_SIGNATURE" && Boolean(execution.hashToSign);
  const simulated = provider?.provider === "moniflow-sandbox";

  return (
    <Screen contentContainerStyle={styles.screen}>
      <FlowHeader
        description={simulated
          ? "This is simulated financial infrastructure. Human approval is still required, but no private key or real provider signature is used."
          : "The approved plan maps to a BMONI proposal. The raw provider digest is signed on-device and the private key never leaves the device."}
        eyebrow="SECURE EXECUTION"
        title={simulated ? "Complete the simulated execution boundary." : "Your key never leaves this device."}
      />

      <SoftCard style={styles.card}>
        <View style={styles.providerRow}>
          <StatusPill label={providerBadge(provider)} tone={simulated ? "processing" : "success"} />
          <Text style={styles.micro}>{provider ? `${provider.label} · ${provider.environment}` : "Provider loading"}</Text>
        </View>
        <StatusPill
          label={loading ? "PREPARING PROPOSAL" : waitingForProvider ? execution?.providerStatus ?? "WAITING FOR PROVIDER" : readyToSign ? "AWAITING SIGNATURE" : execution?.state ?? "BLOCKED"}
          tone={loading || waitingForProvider ? "processing" : readyToSign ? "warning" : execution?.state === "COMPLETED" ? "success" : "processing"}
        />
        <Text style={styles.cardTitle}>
          {readyToSign
            ? `${formatNaira(execution?.amount ?? 0)} proposal ready.`
            : waitingForProvider
              ? `${providerName(provider)} is preparing the proposal.`
              : "Preparing the execution boundary."}
        </Text>
        <Text style={styles.cardCopy}>
          {readyToSign
            ? simulated
              ? "MONIFlow will submit an explicitly simulated sandbox signature. This path cannot run when BMONI is the active provider."
              : "MONIFlow never receives your PIN or private key. The native SDK signs only this exact provider digest."
            : waitingForProvider
              ? "No signature is requested before the provider exposes a valid signing digest."
              : error ?? "Creating or recovering the idempotent provider proposal…"}
        </Text>
      </SoftCard>

      <View style={styles.steps}>
        <ProgressStep index={1} state="complete" title="MONI Guard + approval" detail="Persisted approved plan fingerprint verified" />
        <ProgressStep index={2} state={execution ? "complete" : "active"} title="Provider proposal" detail={execution ? `Proposal ${shortId(execution.proposalId)}` : "Preparing proposal"} />
        <ProgressStep index={3} state={waitingForProvider ? "active" : execution ? "complete" : "pending"} title="Provider readiness" detail={waitingForProvider ? execution?.providerStatus ?? "Waiting" : "Ready for signing"} />
        <ProgressStep index={4} state={readyToSign ? "active" : "pending"} title={simulated ? "Simulated signature" : "Secure device signature"} detail={simulated ? "Sandbox-only, explicitly simulated" : "Raw 32-byte digest"} />
        <ProgressStep index={5} state="pending" title="Provider processing" detail="Provider status drives the result" />
      </View>

      {readyToSign && !simulated ? (
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

      {readyToSign && simulated ? (
        <SoftCard style={styles.sandboxCard}>
          <StatusPill label="SIMULATED SIGNATURE" tone="processing" />
          <Text style={styles.cardCopy}>No real private key, PIN, or BMONI signature is used in this development-provider path.</Text>
          <PrimaryButton disabled={signing} onPress={() => void sign()}>
            {signing ? "Submitting simulation…" : `Continue simulated ${formatNaira(execution.amount)} execution`}
          </PrimaryButton>
        </SoftCard>
      ) : null}

      {error ? (
        <SoftCard style={styles.errorCard}>
          <StatusPill label="PROVIDER CHECK" tone="warning" />
          <Text style={styles.error}>{error}</Text>
        </SoftCard>
      ) : null}

      <Text style={styles.disclosure}>{simulated ? "MONIFLOW SANDBOX NEVER CLAIMS A REAL EXTERNAL TRANSFER." : "BMONI OWNER-PROOF SIGNING AND PROPOSAL-DIGEST SIGNING REMAIN SEPARATE."}</Text>
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
  providerRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cardTitle: { ...typography.heading, color: colors.textPrimary },
  cardCopy: { ...typography.body, color: colors.textSecondary },
  steps: { gap: spacing.xs },
  pinCard: { gap: spacing.md },
  sandboxCard: { gap: spacing.md },
  micro: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.2 },
  pinInput: { ...typography.display, backgroundColor: colors.backgroundPrimary, borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, color: colors.textPrimary, letterSpacing: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.md, textAlign: "center" },
  errorCard: { gap: spacing.sm },
  error: { ...typography.body, color: colors.statusError },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
