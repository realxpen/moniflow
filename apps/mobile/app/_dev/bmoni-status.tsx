import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { GlassCard, Pill, Screen, SectionTitle, StatusPill } from "@/components/ui";
import { colors, radius, spacing, typography } from "@/theme";

type BmoniStatus = {
  bmoniApi: "connected" | "disconnected";
  environment: string;
  supportedCurrencies?: string[];
  user: {
    status: "created" | "not_created" | "unknown";
    bmoniUserId: string | null;
    localUserId?: string;
  };
};

type LifecycleStage = { passed: boolean; detail: string; amount?: string | null };
type LifecycleStatus = {
  environment: string;
  localUserId: string;
  readyForPhase11: boolean;
  stages: {
    api: LifecycleStage;
    user: LifecycleStage;
    wallet: LifecycleStage;
    nigeriaRail: LifecycleStage;
    depositAccount: LifecycleStage;
    fundedBalance: LifecycleStage;
  };
  error?: string;
};

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const configuredLocalUserId = process.env.EXPO_PUBLIC_DEV_LOCAL_USER_ID ?? "";

export default function BmoniStatusScreen() {
  const [localUserId, setLocalUserId] = useState(configuredLocalUserId);
  const [status, setStatus] = useState<BmoniStatus | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    setLifecycle(null);
    try {
      const query = localUserId.trim() ? `?localUserId=${encodeURIComponent(localUserId.trim())}` : "";
      const response = await fetch(`${apiUrl}/api/dev/bmoni-status${query}`);
      const payload = (await response.json()) as BmoniStatus;
      setStatus(payload);
      if (!response.ok) {
        setError("BMONI status check failed. Check the API logs for the safe provider error.");
        return;
      }

      if (localUserId.trim()) {
        const lifecycleResponse = await fetch(`${apiUrl}/api/dev/bmoni-lifecycle?localUserId=${encodeURIComponent(localUserId.trim())}`);
        const lifecyclePayload = (await lifecycleResponse.json()) as LifecycleStatus;
        setLifecycle(lifecyclePayload);
        if (!lifecycleResponse.ok) setError(lifecyclePayload.error ?? "Lifecycle verification could not complete.");
      }
    } catch {
      setStatus(null);
      setLifecycle(null);
      setError("MONIFlow API could not be reached from this device.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <Pill>INTERNAL · BMONI LIFECYCLE</Pill>
        <Text style={styles.title}>Sandbox verification</Text>
        <Text style={styles.body}>Read-only provider checks for the same MONIFlow user. This screen does not create, fund, sign, approve, or move money.</Text>
      </View>

      <GlassCard style={styles.card}>
        <SectionTitle eyebrow="PROVIDER STATUS" title="Foundation" />
        <StatusRow label="BMONI API" value={status?.bmoniApi === "connected" ? "Connected" : status ? "Disconnected" : "Not checked"} positive={status?.bmoniApi === "connected"} />
        <StatusRow label="Environment" value={status?.environment ?? "Sandbox"} />
        <StatusRow label="User" value={status?.user.status === "created" ? "Created" : "Not created"} positive={status?.user.status === "created"} />
        <StatusRow label="BMONI User ID" value={status?.user.bmoniUserId ?? "—"} mono />

        <Text style={styles.inputLabel}>LOCAL USER UUID</Text>
        <TextInput autoCapitalize="none" autoCorrect={false} onChangeText={setLocalUserId} placeholder="MONIFlow local user UUID" placeholderTextColor={colors.textSecondary} style={styles.input} value={localUserId} />
        <Pressable disabled={loading} onPress={() => void refresh()} style={styles.button}>
          <Text style={styles.buttonText}>{loading ? "Checking…" : "Verify lifecycle"}</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {status?.supportedCurrencies ? <Text style={styles.meta}>Provider currencies: {status.supportedCurrencies.join(", ")}</Text> : null}
      </GlassCard>

      {lifecycle ? (
        <GlassCard style={styles.card}>
          <SectionTitle eyebrow="READ-ONLY CHECKS" title="Real BMONI lifecycle" />
          <LifecycleRow label="01 · API" stage={lifecycle.stages.api} />
          <LifecycleRow label="02 · USER" stage={lifecycle.stages.user} />
          <LifecycleRow label="03 · CNGN WALLET" stage={lifecycle.stages.wallet} />
          <LifecycleRow label="04 · NIGERIA RAIL" stage={lifecycle.stages.nigeriaRail} />
          <LifecycleRow label="05 · NGN ACCOUNT" stage={lifecycle.stages.depositAccount} optional />
          <LifecycleRow label="06 · FUNDED BALANCE" stage={lifecycle.stages.fundedBalance} />

          <View style={styles.outcome}>
            <Text style={styles.outcomeLabel}>PHASE 11 GATE</Text>
            <StatusPill label={lifecycle.readyForPhase11 ? "READY" : "NOT READY"} tone={lifecycle.readyForPhase11 ? "success" : "warning"} />
          </View>
          <Text style={styles.meta}>NGN account is shown as an additional rail check; Phase 11 readiness requires API, user, managed CNGN wallet, active Nigeria rail, and a positive provider-backed balance.</Text>
        </GlassCard>
      ) : null}
    </Screen>
  );
}

function StatusRow({ label, value, positive = false, mono = false }: { label: string; value: string; positive?: boolean; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {positive ? <StatusPill label={value} tone="success" /> : <Text style={[styles.rowValue, mono && styles.mono]} numberOfLines={1}>{value}</Text>}
    </View>
  );
}

function LifecycleRow({ label, stage, optional = false }: { label: string; stage: LifecycleStage; optional?: boolean }) {
  const value = stage.amount ? `${stage.detail} · ${stage.amount} CNGN` : stage.detail;
  return (
    <View style={styles.lifecycleRow}>
      <View style={styles.lifecycleCopy}>
        <Text style={styles.rowLabel}>{label}{optional ? " · OPTIONAL" : ""}</Text>
        <Text style={styles.lifecycleDetail}>{value}</Text>
      </View>
      <StatusPill label={stage.passed ? "PASS" : "PENDING"} tone={stage.passed ? "success" : "warning"} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingBottom: spacing.xxxl },
  hero: { gap: spacing.md, paddingTop: spacing.lg },
  title: { ...typography.heading, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary, maxWidth: 560 },
  card: { gap: spacing.lg },
  row: { alignItems: "center", borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", minHeight: 52, gap: spacing.md },
  rowLabel: { ...typography.technical, color: colors.textSecondary },
  rowValue: { ...typography.body, color: colors.textPrimary, flexShrink: 1, textAlign: "right" },
  mono: { fontFamily: "monospace", fontSize: 12 },
  inputLabel: { ...typography.technical, color: colors.textSecondary, marginTop: spacing.md },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: radius.md, borderWidth: 1, color: colors.textPrimary, minHeight: 52, paddingHorizontal: spacing.md },
  button: { alignItems: "center", backgroundColor: colors.textPrimary, borderRadius: radius.pill, minHeight: 52, justifyContent: "center", paddingHorizontal: spacing.lg },
  buttonText: { ...typography.body, color: colors.textInverse, fontWeight: "600" },
  error: { ...typography.caption, color: colors.statusError },
  meta: { ...typography.caption, color: colors.textSecondary },
  lifecycleRow: { alignItems: "center", borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: spacing.md, minHeight: 72, justifyContent: "space-between" },
  lifecycleCopy: { flex: 1, gap: spacing.xxs },
  lifecycleDetail: { ...typography.caption, color: colors.textPrimary },
  outcome: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  outcomeLabel: { ...typography.technical, color: colors.textPrimary }
});
