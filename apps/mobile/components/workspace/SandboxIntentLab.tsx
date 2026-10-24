import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, SoftCard, StatusPill } from "@/components/ui";
import { currentAuthScope } from "@/services/auth-session";
import { previewApiSandboxIntent, type SandboxIntentPreview } from "@/services/sandbox-intent-preview";
import { colors, radius, spacing, typography } from "@/theme";

const money = (amount: number) => "₦" + amount.toLocaleString("en-NG");

/**
 * Optional server-evaluated interpretation lab. It does not touch the durable
 * Money Plan, approval, Activity or Pocket state in the canonical walkthrough.
 */
export function SandboxIntentLab({ ownerId }: { ownerId: string }) {
  const [command, setCommand] = useState("");
  const [preview, setPreview] = useState<SandboxIntentPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);

  useEffect(() => {
    ++sequence.current;
    setCommand("");
    setPreview(null);
    setError(null);
    setBusy(false);
    return () => { ++sequence.current; };
  }, [ownerId]);

  const review = async () => {
    if (busy || !command.trim()) return;
    const scope = currentAuthScope();
    if (scope.userId?.toLowerCase() !== ownerId.toLowerCase()) return;
    const id = ++sequence.current;
    setBusy(true);
    setPreview(null);
    setError(null);
    try {
      const result = await previewApiSandboxIntent(command.trim());
      const active = currentAuthScope();
      if (id !== sequence.current || active.revision !== scope.revision ||
          active.userId?.toLowerCase() !== ownerId.toLowerCase()) return;
      if (result.localUserId.toLowerCase() !== ownerId.toLowerCase()) {
        setError("This preview response belongs to another account and was not shown.");
        return;
      }
      setPreview(result);
    } catch (cause) {
      const active = currentAuthScope();
      if (id === sequence.current && active.revision === scope.revision &&
          active.userId?.toLowerCase() === ownerId.toLowerCase()) {
        setError(cause instanceof Error ? cause.message : "This instruction could not be reviewed.");
      }
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  };

  return (
    <SoftCard style={styles.card}>
      <Text style={styles.micro}>07 · EXPERIMENT WITH OTHER INSTRUCTIONS</Text>
      <Text style={styles.heading}>Try your own Money Plan.</Text>
      <StatusPill label="READ-ONLY PREVIEW · NO EXECUTION" tone="warning" />
      <Text style={styles.body}>
        Use the real MONIFlow parser, Money Plan calculator and MONI Guard with your
        remaining fictional balance. This does not save a plan, change Pockets,
        affect Activity, approve anything or contact BMONI.
      </Text>
      <TextInput
        accessibilityLabel="Practice financial instruction"
        multiline
        maxLength={240}
        value={command}
        onChangeText={value => {
          ++sequence.current;
          setCommand(value);
          setPreview(null);
          setError(null);
          setBusy(false);
        }}
        placeholder="E.g. Save ₦10,000 for my emergency fund"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
      />
      <PrimaryButton disabled={busy || !command.trim()} onPress={() => void review()}>
        {busy ? "Reviewing simulated intent…" : "Review instruction · no changes"}
      </PrimaryButton>
      {error ? <Text style={styles.warning}>{error}</Text> : null}
      {preview?.status === "UNSUPPORTED" ? (
        <View style={styles.results}>
          <StatusPill label="INSTRUCTION NOT SUPPORTED" tone="warning" />
          <Text style={styles.body}>
            MONIFlow could not safely interpret that instruction ({preview.reason}).
            No example state was changed.
          </Text>
        </View>
      ) : null}
      {preview?.status === "PREVIEW" ? (
        <View style={styles.results}>
          <StatusPill label={"MONI GUARD · " + preview.verdict} tone={preview.verdict === "BLOCK" ? "warning" : "processing"} />
          <Text style={styles.micro}>{preview.intent.replace(/_/g, " ")} · EXAMPLE ONLY</Text>
          {preview.actions.map(action => (
            <View key={action.index} style={styles.row}>
              <Text style={styles.body}>{action.label} · {action.kind.replace(/_/g, " ")}</Text>
              <Text style={styles.value}>{money(action.amount)}</Text>
            </View>
          ))}
          <View style={styles.row}>
            <Text style={styles.body}>Available before</Text>
            <Text style={styles.value}>{money(preview.availableToSpend)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.body}>Illustrative available after</Text>
            <Text style={styles.value}>{money(preview.totals.availableAfter)}</Text>
          </View>
          {preview.checks.filter(c => !c.passed).map(check => (
            <Text key={check.rule} style={styles.warning}>{check.rule}: {check.message}</Text>
          ))}
          <Text style={styles.warning}>
            {preview.verdict === "BLOCK"
              ? "MONI Guard blocks this plan. No action can proceed."
              : "Interpretation only: no bank was verified and no approval or execution is available here."}
          </Text>
        </View>
      ) : null}
    </SoftCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  heading: { ...typography.section, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary, flexShrink: 1 },
  micro: { ...typography.technical, color: colors.statusProcessing },
  warning: { ...typography.caption, color: colors.statusWarning },
  input: {
    minHeight: 92, padding: spacing.md, borderWidth: 1,
    borderColor: colors.borderSoft, borderRadius: radius.lg,
    backgroundColor: colors.backgroundPrimary, color: colors.textPrimary,
    textAlignVertical: "top", ...typography.body
  },
  results: { gap: spacing.md, paddingTop: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  value: { ...typography.body, color: colors.textPrimary, fontWeight: "700", textAlign: "right" }
});
