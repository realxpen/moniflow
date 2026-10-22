import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { useAppActiveRefresh } from "@/hooks/use-app-active-refresh";
import {
  approveApiSandboxPlan, bootstrapApiSandbox, loadApiSandbox, prepareApiSandboxPlan,
  resetApiSandbox, sandboxDemoCommand, SandboxApiError, simulateApiSandboxPlan,
  type ApiSandboxWorkspace
} from "@/services/sandbox-api";
import { useProductPreview } from "@/store/product-preview";
import { colors, layout, radius, spacing, typography } from "@/theme";

const currency = (amount: number) => "₦" + amount.toLocaleString("en-NG");

type DemoTab = "home" | "pockets" | "activity";

/**
 * An API-backed, genuine persistence demo using the backend's actual intent
 * parser, Money Plan, MONI Guard and exact-hash human approval.
 * The backend is an isolated *simulator*, not BMONI.
 *
 * This screen is never used as evidence of real funds, wallet ownership,
 * Nigerian KYC, bank verification or financial settlement.
 */
export function ServerSandboxWorkspace({ ownerId, tab, onExit }: {
  ownerId: string; tab: DemoTab; onExit: () => void;
}) {
  const switchOffline = useProductPreview(state => state.disableServer);
  const [workspace, setWorkspace] = useState<ApiSandboxWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [resetAcknowledged, setResetAcknowledged] = useState(false);
  const ownerRef = useRef(ownerId);
  const requestRef = useRef(0);
  const actionRef = useRef(false);
  ownerRef.current = ownerId;

  const applySnapshot = useCallback((snapshot: ApiSandboxWorkspace, owner: string, seq: number) => {
    if (seq !== requestRef.current || ownerRef.current !== owner) return;
    if (snapshot.localUserId.toLowerCase() !== owner.toLowerCase() ||
        snapshot.provider !== "moniflow-sandbox" || snapshot.simulated !== true) {
      setWorkspace(null);
      setError("The server returned a workspace that does not belong to this verified account.");
      return;
    }
    setWorkspace(snapshot);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    const seq = ++requestRef.current;
    const owner = ownerId;
    setLoading(true);
    setError(null);
    setWorkspace(null);
    try {
      const snapshot = await loadApiSandbox();
      applySnapshot(snapshot, owner, seq);
    } catch (cause) {
      if (seq !== requestRef.current || ownerRef.current !== owner) return;
      if (cause instanceof SandboxApiError && cause.code === "SANDBOX_NOT_STARTED") {
        setWorkspace(null);
        setError(null);
      } else {
        setError(cause instanceof Error ? cause.message : "The isolated simulated API is not accessible.");
      }
    } finally {
      if (seq === requestRef.current && ownerRef.current === owner) setLoading(false);
    }
  }, [ownerId, applySnapshot]);

  useEffect(() => {
    actionRef.current = false;
    setWorkspace(null);
    setError(null);
    setAcknowledged(false);
    setResetAcknowledged(false);
    void refresh();
    return () => { ++requestRef.current; };
  }, [refresh]);
  useAppActiveRefresh(refresh);

  const act = async (action: () => Promise<ApiSandboxWorkspace>) => {
    if (actionRef.current || busy || loading) return;
    actionRef.current = true;
    const seq = ++requestRef.current;
    const owner = ownerId;
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      applySnapshot(result, owner, seq);
      if (seq === requestRef.current && ownerRef.current === owner) {
        setAcknowledged(false);
        setResetAcknowledged(false);
      }
    } catch (cause) {
      if (seq === requestRef.current && ownerRef.current === owner) {
        setError(cause instanceof Error ? cause.message : "The example request was not confirmed.");
        // Explicit read-only reconciliation only. Never auto-retry mutations.
        setWorkspace(null);
      }
    } finally {
      actionRef.current = false;
      if (seq === requestRef.current && ownerRef.current === owner) setBusy(false);
    }
  };
  const plan = workspace?.plan ?? null;
  const safeWorkspace = Boolean(workspace?.simulated && workspace.provider === "moniflow-sandbox" &&
    workspace.localUserId.toLowerCase() === ownerId.toLowerCase());

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.micro}>MONIFLOW · SERVER-SAVED SANDBOX</Text>
          <Text style={styles.heading}>
            {tab === "home" ? "Your money, in focus." : tab === "pockets" ? "Money pockets." : "Your activity."}
          </Text>
        </View>
        <Pressable accessibilityRole="button" style={styles.exit} onPress={onExit}>
          <Text style={styles.exitLabel}>Exit demo</Text>
        </Pressable>
      </View>
      <StatusPill label="PERSISTED SIMULATION · NO BMONI MONEY" tone="warning" />
      <Text style={styles.body}>
        This is an authenticated, private example workspace. The MONIFlow API stores its hypothetical
        plan, checks and activity separately from your real financial account.
      </Text>

      {loading ? <SoftCard style={styles.card}>
        <StatusPill label="CHECKING SANDBOX STATE" tone="processing" />
        <Text style={styles.body}>Reading the latest saved simulation for this account…</Text>
      </SoftCard> : null}

      {!loading && error ? (
        <SoftCard style={styles.card}>
          <StatusPill label="SANDBOX STATUS UNCONFIRMED" tone="warning" />
          <Text style={styles.body}>{error}</Text>
          <Text style={styles.body}>The API may be disabled on this release. No payments have been attempted.</Text>
          <SecondaryButton disabled={busy} onPress={() => void refresh()}>Recheck server state · read only</SecondaryButton>
        </SoftCard>
      ) : null}

      {!loading && !error && !safeWorkspace ? (
        <SoftCard style={styles.card}>
          <Text style={styles.micro}>ONE PRIVATE EXAMPLE ACCOUNT</Text>
          <Text style={styles.title}>Start a saved sandbox walkthrough.</Text>
          <Text style={styles.body}>
            The backend starts with ₦300,000 of fictional funds, and uses MONIFlow's
            actual deterministic parser, Money Plan engine, MONI Guard and approval hashing.
          </Text>
          <Text style={styles.notice}>This action does not create a BMONI user, wallet or real deposit.</Text>
          <PrimaryButton disabled={busy} onPress={() => void act(bootstrapApiSandbox)}>
            Initialize saved example
          </PrimaryButton>
        </SoftCard>
      ) : null}

      {!loading && !error && safeWorkspace && workspace ? (
        <>
          <View style={styles.balanceCard}>
            <Text style={styles.micro}>ILLUSTRATIVE AVAILABLE · NOT REAL FUNDS</Text>
            <Text style={styles.balance} adjustsFontSizeToFit numberOfLines={1}>
              {currency(workspace.availableToSpend)}
            </Text>
            <Text style={styles.body}>Example provider balance: {currency(workspace.providerBalance)}</Text>
            <Text style={styles.body}>Internal Pocket allocation: {currency(workspace.internalAllocated)}</Text>
          </View>

          {tab === "home" ? (
            !plan ? (
              <SoftCard style={styles.card}>
                <Text style={styles.micro}>01 · INTENT</Text>
                <Text style={styles.title}>What should your money do?</Text>
                <Text style={styles.quote}>{sandboxDemoCommand}</Text>
                <Text style={styles.body}>The backend will interpret this example into a real, stored sandbox Money Plan and run MONI Guard.</Text>
                <PrimaryButton disabled={busy} onPress={() => void act(prepareApiSandboxPlan)}>
                  Build Money Plan + run MONI Guard
                </PrimaryButton>
              </SoftCard>
            ) : (
              <>
                <SoftCard style={styles.card}>
                  <Text style={styles.micro}>02 · SAVED MONEY PLAN</Text>
                  <Text style={styles.title}>{plan.state === "COMPLETED" ? "Example completed." : "Review your example plan."}</Text>
                  <MoneyRow label="GTBank withdrawal · simulated" value={"−" + currency(plan.plan.totals.externalMovement)} />
                  <MoneyRow label="Laptop Pocket · internal" value={"−" + currency(plan.plan.totals.internalAllocation)} />
                  <View style={styles.separator} />
                  <MoneyRow label="Example available after" value={currency(plan.plan.totals.availableAfter)} />
                  <Text style={styles.micro}>03 · ACTUAL MONI GUARD · {plan.verdict.verdict}</Text>
                  {plan.verdict.checks.map((check, i) => (
                    <View key={check.rule + ":" + i} style={styles.check}>
                      <Text style={styles.checkTitle}>{check.passed ? "CHECKED" : "REVIEW"} · {check.rule}</Text>
                      <Text style={styles.body}>{check.message}</Text>
                    </View>
                  ))}
                  <Text style={styles.notice}>A saved example plan and a Guard review do not verify any real bank account or authorize a provider transfer.</Text>
                </SoftCard>
                {plan.state === "AWAITING_APPROVAL" ? (
                  <SoftCard style={styles.card}>
                    <Text style={styles.micro}>04 · EXPLICIT HUMAN REVIEW</Text>
                    <Text style={styles.body}>
                      I have reviewed the unchanged ₦40,000 hypothetical withdrawal and ₦20,000
                      example Laptop allocation. This is a simulation, not a payment approval.
                    </Text>
                    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acknowledged }}
                      style={styles.checkboxRow} onPress={() => setAcknowledged(value => !value)}>
                      <Text style={styles.checkTitle}>{acknowledged ? "☑" : "□"} I understand this is simulated.</Text>
                    </Pressable>
                    <PrimaryButton disabled={!acknowledged || busy} onPress={() =>
                      void act(() => approveApiSandboxPlan(plan.id, plan.planHash))}>
                      Acknowledge exact plan · demo only
                    </PrimaryButton>
                  </SoftCard>
                ) : null}
                {plan.state === "APPROVED" ? (
                  <SoftCard style={styles.card}>
                    <Text style={styles.micro}>05 · SIMULATED EXECUTION</Text>
                    <Text style={styles.body}>The backend has saved your exact-hash approval. This next action records simulated outcomes only.</Text>
                    <PrimaryButton disabled={busy} onPress={() => void act(() => simulateApiSandboxPlan(plan.id))}>
                      Simulate approved plan · no provider call
                    </PrimaryButton>
                  </SoftCard>
                ) : null}
                {plan.state === "COMPLETED" ? (
                  <SoftCard style={styles.card}>
                    <Text style={styles.micro}>06 · SIMULATED RESULT</Text>
                    <StatusPill label="EXAMPLE COMPLETE · NOT SETTLED" tone="warning" />
                    <Text style={styles.body}>Two illustrated events were saved to your isolated sandbox.
                      Neither is a BMONI transfer receipt.</Text>
                  </SoftCard>
                ) : null}
              </>
            )
          ) : null}

          {tab === "pockets" ? (
            <SoftCard style={styles.card}>
              <Text style={styles.micro}>INTERNAL ALLOCATION · NOT PROVIDER CUSTODY</Text>
              <Text style={styles.title}>Laptop money space</Text>
              <MoneyRow label="Illustrative amount" value={currency(workspace.internalAllocated)} />
              <Text style={styles.body}>Pocket allocation is internal MONIFlow bookkeeping. It does not represent a separate BMONI deposit or escrow.</Text>
              {!plan ? <Text style={styles.body}>Create the example plan in Home to allocate funds after simulated execution.</Text> : null}
            </SoftCard>
          ) : null}

          {tab === "activity" ? (
            <>
              <Text style={styles.micro}>SAVED SIMULATED FINANCIAL MEMORY</Text>
              {workspace.activity.length ? workspace.activity.map(item => (
                <View key={item.reference} style={styles.activity}>
                  <View style={styles.activityCopy}>
                    <Text style={styles.checkTitle}>{item.kind === "BANK_WITHDRAWAL" ? "GTBank · simulated withdrawal" : "Laptop · internal allocation"}</Text>
                    <Text style={styles.micro}>SIMULATED · NOT SETTLED</Text>
                  </View>
                  <Text style={styles.amount}>−{currency(item.amount)}</Text>
                </View>
              )) : (
                <SoftCard style={styles.card}>
                  <Text style={styles.title}>Nothing simulated yet.</Text>
                  <Text style={styles.body}>The activity list will show the saved result after an explicitly approved example.</Text>
                </SoftCard>
              )}
            </>
          ) : null}

          <SoftCard style={styles.card}>
            <Text style={styles.micro}>RESTART THE SAVED SIMULATION</Text>
            <Text style={styles.body}>Reset erases only this account's fictional practice plan, balance and history. Real accounts and provider information are untouched.</Text>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: resetAcknowledged }}
              style={styles.checkboxRow} onPress={() => setResetAcknowledged(value => !value)}>
              <Text style={styles.checkTitle}>{resetAcknowledged ? "☑" : "□"} Clear this practice workspace</Text>
            </Pressable>
            <SecondaryButton disabled={!resetAcknowledged || busy} onPress={() => void act(resetApiSandbox)}>
              Reset saved example
            </SecondaryButton>
          </SoftCard>
          <SecondaryButton disabled={busy} onPress={() => void refresh()}>
            Refresh authoritative demo state · read only
          </SecondaryButton>
        </>
      ) : null}
      <SecondaryButton onPress={() => switchOffline(ownerId)}>Return to local example</SecondaryButton>
      <Text style={styles.notice}>
        SERVER-SAVED SANDBOX · HUMAN APPROVAL APPLIES TO THE DEMO ONLY ·
        NO BANK VERIFICATION · NO PROVIDER SIGNATURE · NO REAL MONEY
      </Text>
    </Screen>
  );
}
function MoneyRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.moneyRow}>
    <Text style={styles.body}>{label}</Text>
    <Text style={styles.amount}>{value}</Text>
  </View>;
}
const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.lg, paddingBottom: layout.tabContentBottomInset },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  headerCopy: { flex: 1, gap: spacing.sm },
  heading: { ...typography.heading, color: colors.textPrimary },
  title: { ...typography.section, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
  micro: { ...typography.technical, color: colors.statusProcessing },
  notice: { ...typography.caption, color: colors.statusWarning },
  exit: { borderRadius: radius.pill, backgroundColor: colors.surface, minHeight: 44,
    justifyContent: "center", paddingHorizontal: spacing.md },
  exitLabel: { ...typography.caption, color: colors.textPrimary, fontWeight: "700" },
  balanceCard: { backgroundColor: colors.accentSoft, borderRadius: radius.card, padding: spacing.xl, gap: spacing.md },
  balance: { ...typography.display, color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  card: { gap: spacing.md },
  quote: { ...typography.section, color: colors.textPrimary, backgroundColor: colors.backgroundPrimary,
    borderRadius: radius.lg, padding: spacing.lg },
  moneyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  amount: { ...typography.section, color: colors.textPrimary, textAlign: "right" },
  separator: { height: 1, backgroundColor: colors.borderSoft },
  check: { gap: spacing.xs, paddingVertical: spacing.xs },
  checkTitle: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },
  checkboxRow: { minHeight: 48, justifyContent: "center", padding: spacing.sm,
    borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.lg },
  activity: { flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.lg },
  activityCopy: { flex: 1, gap: spacing.xs }
});
