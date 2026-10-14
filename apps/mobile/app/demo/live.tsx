import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { useAuthSession } from "@/services/auth-session";
import {
  approveApiSandboxPlan, bootstrapApiSandbox, loadApiSandbox, prepareApiSandboxPlan,
  resetApiSandbox, sandboxDemoCommand, SandboxApiError, simulateApiSandboxPlan,
  type ApiSandboxWorkspace
} from "@/services/sandbox-api";
import { colors, spacing, typography } from "@/theme";

const naira = (value: number) => "₦" + value.toLocaleString("en-NG");
export default function ApiBackedSandboxScreen() {
  const auth = useAuthSession();
  const [workspace, setWorkspace] = useState<ApiSandboxWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvedAcknowledgment, setApprovedAcknowledgment] = useState(false);
  const [resetAcknowledgment, setResetAcknowledgment] = useState(false);

  const accountId = auth?.userId ?? null;
  const activeAccount = useRef(accountId);
  activeAccount.current = accountId;
  const requestSequence = useRef(0);
  const actionPending = useRef(false);
  const actionSequence = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!accountId) {
      setWorkspace(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setWorkspace(null);
    setError(null);
    try {
      const result = await loadApiSandbox();
      if (requestId !== requestSequence.current || activeAccount.current !== accountId) return;
      if (result.localUserId.toLowerCase() !== accountId.toLowerCase()) {
        throw new Error("The returned sandbox belongs to another account.");
      }
      setWorkspace(result);
    } catch (cause) {
      if (requestId !== requestSequence.current || activeAccount.current !== accountId) return;
      setWorkspace(null);
      if (cause instanceof SandboxApiError && cause.code === "SANDBOX_NOT_STARTED") {
        setError(null);
      } else {
        setError(cause instanceof Error ? cause.message : "The authenticated sandbox is unavailable.");
      }
    } finally {
      if (requestId === requestSequence.current && activeAccount.current === accountId) {
        setLoading(false);
      }
    }
  }, [accountId]);

  useEffect(() => {
    requestSequence.current++;
    actionSequence.current++;
    actionPending.current = false;
    setWorkspace(null);
    setError(null);
    setBusy(false);
    setApprovedAcknowledgment(false);
    setResetAcknowledgment(false);
    void load();
    return () => { requestSequence.current++; };
  }, [load]);

  const apply = async (action: () => Promise<ApiSandboxWorkspace>) => {
    if (!accountId || actionPending.current) return;
    // An immediate ref lock avoids double taps before React updates disabled state.
    actionPending.current = true;
    const actionId = ++actionSequence.current;
    const requestId = ++requestSequence.current;
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (requestId !== requestSequence.current || activeAccount.current !== accountId) return;
      if (result.localUserId.toLowerCase() !== accountId.toLowerCase()) {
        throw new Error("The sandbox returned a different authenticated user.");
      }
      setWorkspace(result);
      setApprovedAcknowledgment(false);
      setResetAcknowledgment(false);
    } catch (cause) {
      if (requestId !== requestSequence.current || activeAccount.current !== accountId) return;
      setError(cause instanceof Error ? cause.message : "The sandbox operation could not complete.");
      // A timed-out mutation could still have committed. Never retry it automatically.
      // The explicit read-only status button reconciles uncertain outcomes.
    } finally {
      if (actionId === actionSequence.current) actionPending.current = false;
      if (requestId === requestSequence.current && activeAccount.current === accountId) {
        setBusy(false);
      }
    }
  };
  const plan = workspace?.plan;
  const completed = plan?.state === "COMPLETED";
  const showsAuthoritativeWorkspace = accountId !== null && workspace?.localUserId.toLowerCase() === accountId.toLowerCase();

  return (
    <Screen contentContainerStyle={styles.page}>
      <FlowHeader eyebrow="PHASE 19 · AUTHENTICATED SIMULATED LEDGER"
        title="A real plan. Simulated money."
        description="This sandbox saves Money Plans, Guard checks, approvals, and financial activity to a separate database workspace tied to your signed-in account." />
      <StatusPill label="MONIFLOW SANDBOX · NO BMONI FUNDS" tone="warning" />
      <Text style={styles.note}>All financial movements here are simulated. This is not a BMONI wallet, actual bank verification or settled transfer.</Text>

      {!auth ? (
        <SoftCard style={styles.card}>
          <Text style={styles.heading}>Sign in to start.</Text>
          <Text style={styles.copy}>Unlike the offline walkthrough, this demo stores your own isolated simulated financial history on the MONIFlow API.</Text>
          <PrimaryButton onPress={() => router.push("/auth/sign-in")}>Sign in</PrimaryButton>
        </SoftCard>
      ) : loading ? (
        <SoftCard style={styles.card}><StatusPill label="READING SERVER CHECKPOINT" tone="processing" /><Text style={styles.copy}>Checking your saved sandbox state…</Text></SoftCard>
      ) : error ? (
        <SoftCard style={styles.card}>
          <StatusPill label="SANDBOX STATUS UNKNOWN" tone="warning" />
          <Text style={styles.copy}>The server did not confirm whether your simulated workspace already exists. Please check status before attempting to create anything.</Text>
          <SecondaryButton disabled={busy || loading} onPress={() => void load()}>Read existing state only</SecondaryButton>
        </SoftCard>
      ) : !showsAuthoritativeWorkspace ? (
        <SoftCard style={styles.card}>
          <Text style={styles.heading}>Start a dedicated simulated workspace.</Text>
          <Text style={styles.copy}>Your demo opens at ₦300,000 once. It cannot change your BMONI profile, real wallet or payment history.</Text>
          <PrimaryButton disabled={busy} onPress={() => void apply(bootstrapApiSandbox)}>
            {busy ? "Creating demo…" : "Initialize my simulated ledger"}
          </PrimaryButton>
        </SoftCard>
      ) : (
        <>
          <SoftCard style={styles.card}>
            <Text style={styles.micro}>SAVED SIMULATED BALANCES</Text>
            <MoneyRow title="Illustrative provider balance" amount={naira(workspace.providerBalance)} />
            <MoneyRow title="Internal Laptop allocation" amount={naira(workspace.internalAllocated)} />
            <View style={styles.divider} />
            <MoneyRow title="Illustrative available to spend" amount={naira(workspace.availableToSpend)} emphasis />
            <Text style={styles.note}>API-backed simulated values, not funds held by BMONI.</Text>
          </SoftCard>
          {!plan ? (
            <SoftCard style={styles.card}>
              <Text style={styles.micro}>MILESTONE 1 · INTENT → PERSISTED MONEY PLAN</Text>
              <Text style={styles.heading}>Review the instruction.</Text>
              <Text style={styles.copy}>{sandboxDemoCommand}</Text>
              <Text style={styles.note}>The server will run the same deterministic intent parser, Money Plan builder and MONI Guard code as MONIFlow's main API.</Text>
              <PrimaryButton disabled={busy} onPress={() => void apply(prepareApiSandboxPlan)}>
                {busy ? "Preparing…" : "Build and save Money Plan"}
              </PrimaryButton>
            </SoftCard>
          ) : (
            <SoftCard style={styles.card}>
              <Text style={styles.micro}>SAVED PLAN · {plan.state.replaceAll("_", " ")}</Text>
              <StatusPill label={plan.state === "COMPLETED" ? "SIMULATION COMPLETED" :
                plan.state === "APPROVED" ? "EXAMPLE APPROVED" : "HUMAN REVIEW REQUIRED"}
                tone={plan.state === "COMPLETED" ? "processing" : "warning"} />
              <MoneyRow title="GTBank · hypothetical external withdrawal" amount={naira(plan.plan.totals.externalMovement)} />
              <MoneyRow title="Laptop · internal simulated allocation" amount={naira(plan.plan.totals.internalAllocation)} />
              <MoneyRow title="Total example commitment" amount={naira(plan.plan.totals.externalMovement + plan.plan.totals.internalAllocation)} />
              <Text style={styles.micro}>MONI GUARD · {plan.verdict.verdict}</Text>
              {plan.verdict.checks.map(check => (
                <View key={check.rule} style={styles.rule}>
                  <Text style={styles.ruleHeading}>{check.passed ? "✓" : "!"} {check.rule.replaceAll("_", " ")}</Text>
                  <Text style={styles.small}>{check.message}</Text>
                </View>
              ))}
              {plan.state === "AWAITING_APPROVAL" ? (
                <>
                  <Text style={styles.note}>GTBank is an illustrative destination label—not a verified bank account. Approval only advances this simulated ledger.</Text>
                  <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: approvedAcknowledgment }}
                    style={styles.checkRow} onPress={() => setApprovedAcknowledgment(v => !v)}>
                    <Text style={styles.checkMark}>{approvedAcknowledgment ? "☑" : "☐"}</Text>
                    <Text style={styles.copy}>I understand this only approves a simulated withdrawal and internal allocation.</Text>
                  </Pressable>
                  <PrimaryButton disabled={busy || !approvedAcknowledgment}
                    onPress={() => void apply(() => approveApiSandboxPlan(plan.id, plan.planHash))}>
                    {busy ? "Saving approval…" : "Approve this simulated plan"}
                  </PrimaryButton>
                </>
              ) : null}
              {plan.state === "APPROVED" ? (
                <>
                  <Text style={styles.note}>Approval was persisted. A separate explicit step is required before the simulated ledger changes.</Text>
                  <PrimaryButton disabled={busy} onPress={() => void apply(() => simulateApiSandboxPlan(plan.id))}>
                    {busy ? "Simulating…" : "Execute simulated financial actions"}
                  </PrimaryButton>
                </>
              ) : null}
              {completed ? (
                <>
                  <Text style={styles.heading}>Example activity · persisted in the sandbox</Text>
                  {workspace.activity.map(item => (
                    <View key={item.reference} style={styles.rule}>
                      <Text style={styles.ruleHeading}>{item.label} · {naira(item.amount)}</Text>
                      <Text style={styles.small}>{item.source.replaceAll("_", " ").toUpperCase()} · NOT SETTLED</Text>
                    </View>
                  ))}
                  <Text style={styles.note}>Refreshing this screen reads the same result from the API. It does not withdraw or allocate again.</Text>
                </>
              ) : null}
            </SoftCard>
          )}
          <SecondaryButton disabled={busy || loading} onPress={() => void load()}>Recheck saved server state</SecondaryButton>
          <SoftCard style={styles.card}>
            <Text style={styles.micro}>RESET ONLY THIS SIMULATED WORKSPACE</Text>
            <Text style={styles.copy}>For repeated demonstrations you can clear the simulated plan, Pockets and Activity. Real BMONI financial records cannot be affected.</Text>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: resetAcknowledgment }}
              style={styles.checkRow} onPress={() => setResetAcknowledgment(v => !v)}>
              <Text style={styles.checkMark}>{resetAcknowledgment ? "☑" : "☐"}</Text>
              <Text style={styles.copy}>I want to reset my own simulated money to ₦300,000.</Text>
            </Pressable>
            <SecondaryButton disabled={busy || !resetAcknowledgment} onPress={() => void apply(resetApiSandbox)}>
              Reset simulated data only
            </SecondaryButton>
          </SoftCard>
        </>
      )}
      {error ? (
        <SoftCard style={styles.card}>
          <StatusPill label="STATUS UNCONFIRMED" tone="warning" />
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.note}>Do not retry a financial simulation until you have checked the saved status. A timed-out request may already have completed.</Text>
          <SecondaryButton disabled={busy || loading} onPress={() => void load()}>Read saved server status (no replay)</SecondaryButton>
        </SoftCard>
      ) : null}
      <SecondaryButton onPress={() => router.push("/demo/operator")}>Use the offline Operator walkthrough</SecondaryButton>
      <Pressable accessibilityRole="button" style={styles.back} onPress={() => router.replace("/onboarding/welcome")}>
        <Text style={styles.small}>Back to MONIFlow</Text>
      </Pressable>
    </Screen>
  );
}

function MoneyRow({ title, amount, emphasis = false }: { title: string; amount: string; emphasis?: boolean }) {
  return <View style={styles.moneyRow}><Text style={styles.moneyLabel}>{title}</Text>
    <Text style={[styles.moneyValue, emphasis && styles.emphasis]}>{amount}</Text></View>;
}
const styles = StyleSheet.create({
  page: { gap: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  card: { gap: spacing.md },
  heading: { ...typography.section, color: colors.textPrimary },
  copy: { ...typography.body, color: colors.textSecondary, flexShrink: 1 },
  micro: { ...typography.technical, color: colors.statusProcessing },
  note: { ...typography.caption, color: colors.statusWarning },
  small: { ...typography.caption, color: colors.textSecondary },
  error: { ...typography.body, color: colors.statusError },
  moneyRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, alignItems: "center" },
  moneyLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  moneyValue: { ...typography.section, color: colors.textPrimary },
  emphasis: { color: colors.statusSuccess, fontWeight: "700" },
  divider: { height: 1, backgroundColor: colors.borderSoft },
  rule: { gap: spacing.xs, paddingVertical: spacing.xs },
  ruleHeading: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  checkMark: { ...typography.section, color: colors.statusProcessing },
  back: { alignItems: "center", paddingVertical: spacing.md }
});
