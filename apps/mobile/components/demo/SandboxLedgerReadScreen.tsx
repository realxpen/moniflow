import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { useAuthSession } from "@/services/auth-session";
import { loadApiSandbox, SandboxApiError, type ApiSandboxWorkspace } from "@/services/sandbox-api";
import {
  isConsistentSandboxReadModel, simulatedActivity, simulatedPocketAllocations
} from "@/services/sandbox-view";
import { colors, spacing, typography } from "@/theme";

type ScreenKind = "pockets" | "activity";
const naira = (amount: number) => "₦" + amount.toLocaleString("en-NG");

/** Isolated demo-only readouts. Normal tabs remain backed by normal financial repositories. */
export function SandboxLedgerReadScreen({ kind }: { kind: ScreenKind }) {
  const auth = useAuthSession();
  const accountId = auth?.userId ?? null;
  const activeAccount = useRef(accountId);
  activeAccount.current = accountId;
  const requestId = useRef(0);
  const [workspace, setWorkspace] = useState<ApiSandboxWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [notStarted, setNotStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sequence = ++requestId.current;
    setWorkspace(null);
    setError(null);
    setNotStarted(false);
    if (!accountId) { setLoading(false); return; }
    setLoading(true);
    try {
      const result = await loadApiSandbox();
      if (sequence !== requestId.current || activeAccount.current !== accountId) return;
      if (result.localUserId.toLowerCase() !== accountId.toLowerCase()) {
        throw new Error("This simulated ledger does not belong to the signed-in account.");
      }
      if (!isConsistentSandboxReadModel(result)) {
        throw new Error("The simulated ledger did not pass the consistency check. No financial entries were displayed.");
      }
      setWorkspace(result);
    } catch (cause) {
      if (sequence !== requestId.current || activeAccount.current !== accountId) return;
      if (cause instanceof SandboxApiError && cause.code === "SANDBOX_NOT_STARTED") {
        setNotStarted(true);
      } else {
        setError(cause instanceof Error ? cause.message : "Cannot read simulated financial records.");
      }
    } finally {
      if (sequence === requestId.current && activeAccount.current === accountId) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void load();
    return () => { requestId.current++; };
  }, [load]);

  const isPocket = kind === "pockets";
  const pocketRows = workspace ? simulatedPocketAllocations(workspace) : [];
  const activityRows = workspace ? simulatedActivity(workspace) : [];
  const completed = workspace?.plan?.state === "COMPLETED";

  return (
    <Screen contentContainerStyle={styles.page}>
      <FlowHeader eyebrow="ISOLATED MONIFLOW SANDBOX"
        title={isPocket ? "Simulated money spaces." : "Simulated activity."}
        description={isPocket
          ? "See how much of your simulated balance was assigned to a purpose."
          : "Review the exact illustrative entries saved after approving the example plan."} />
      <StatusPill tone="warning" label="SIMULATED · NOT BMONI FUNDS" />
      <Text style={styles.note}>This screen reads only your authenticated MONIFlow sandbox record. It is separate from real wallet balances, Pockets, and provider transaction history.</Text>

      {!auth ? (
        <SoftCard style={styles.card}>
          <Text style={styles.heading}>Sign in to inspect your demo.</Text>
          <PrimaryButton onPress={() => router.push("/auth/sign-in")}>Sign in</PrimaryButton>
        </SoftCard>
      ) : loading ? (
        <SoftCard style={styles.card}>
          <StatusPill tone="processing" label="READING PERSISTED STATE" />
          <Text style={styles.copy}>Retrieving this account's simulated ledger without changing it…</Text>
        </SoftCard>
      ) : error ? (
        <SoftCard style={styles.card}>
          <StatusPill tone="warning" label="READ FAILED" />
          <Text style={styles.copy}>{error}</Text>
          <SecondaryButton onPress={() => void load()}>Read status again</SecondaryButton>
        </SoftCard>
      ) : notStarted || !workspace ? (
        <SoftCard style={styles.card}>
          <Text style={styles.heading}>No isolated demo workspace yet.</Text>
          <Text style={styles.copy}>Initialize the simulated ₦300,000 workspace in the demo before reviewing saved entries.</Text>
          <PrimaryButton onPress={() => router.push("/demo/live")}>Open authenticated demo</PrimaryButton>
        </SoftCard>
      ) : (
        <>
          <SoftCard style={styles.card}>
            <Text style={styles.micro}>SIMULATED LEDGER · SERVER PERSISTED</Text>
            <View style={styles.row}>
              <Text style={styles.copy}>Available (unallocated)</Text>
              <Text style={styles.value}>{naira(workspace.availableToSpend)}</Text>
            </View>
            {isPocket ? (
              <>
                <View style={styles.row}>
                  <Text style={styles.copy}>Total allocated</Text>
                  <Text style={styles.value}>{naira(workspace.internalAllocated)}</Text>
                </View>
                <Text style={styles.note}>Allocations are logical bookkeeping within the sandbox, not separate bank accounts.</Text>
              </>
            ) : (
              <Text style={styles.note}>These records do not prove a bank withdrawal occurred.</Text>
            )}
          </SoftCard>
          <SoftCard style={styles.card}>
            <Text style={styles.micro}>{isPocket ? "SIMULATED POCKET ALLOCATIONS" : "SIMULATED FINANCIAL MEMORY"}</Text>
            {isPocket ? (
              pocketRows.length ? pocketRows.map(pocket => (
                <View key={pocket.reference} style={styles.entry}>
                  <Text style={styles.heading}>{pocket.label}</Text>
                  <Text style={styles.value}>{naira(pocket.amount)}</Text>
                  <Text style={styles.small}>Allocated in MONIFlow's simulated ledger only</Text>
                </View>
              )) : <Text style={styles.copy}>No allocations yet. Complete the canonical simulated plan to populate this section.</Text>
            ) : (
              activityRows.length ? activityRows.map(entry => (
                <View key={entry.reference} style={styles.entry}>
                  <Text style={styles.heading}>{entry.kind === "BANK_WITHDRAWAL" ? "Illustrative bank withdrawal" : "Internal simulated allocation"}</Text>
                  <View style={styles.row}>
                    <Text style={styles.copy}>{entry.label}</Text>
                    <Text style={styles.value}>{entry.kind === "BANK_WITHDRAWAL" ? "−" : ""}{naira(entry.amount)}</Text>
                  </View>
                  <Text style={styles.small}>SIMULATED · NOT SETTLED · {entry.source.replaceAll("_", " ").toUpperCase()}</Text>
                </View>
              )) : <Text style={styles.copy}>No simulated financial actions yet. Approval alone does not create Activity; complete the explicit simulation step.</Text>
            )}
            {!completed ? <Text style={styles.note}>A plan must be fully simulated before any allocation or activity appears here.</Text> : null}
          </SoftCard>
        </>
      )}
      <SecondaryButton disabled={loading} onPress={() => void load()}>Refresh read-only state</SecondaryButton>
      <PrimaryButton onPress={() => router.push("/demo/live")}>Back to authenticated demo</PrimaryButton>
      <SecondaryButton onPress={() => router.push(isPocket ? "/demo/activity" : "/demo/pockets")}>
        {isPocket ? "View simulated activity" : "View simulated money spaces"}
      </SecondaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  card: { gap: spacing.md },
  micro: { ...typography.technical, color: colors.statusProcessing },
  heading: { ...typography.section, color: colors.textPrimary },
  copy: { ...typography.body, color: colors.textSecondary, flexShrink: 1 },
  value: { ...typography.section, color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  small: { ...typography.caption, color: colors.textSecondary },
  note: { ...typography.caption, color: colors.statusWarning },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  entry: { gap: spacing.xs, borderTopColor: colors.borderSoft, borderTopWidth: 1, paddingTop: spacing.md }
});
