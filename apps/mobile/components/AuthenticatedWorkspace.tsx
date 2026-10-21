import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { ReadOnlyHomeHero } from "@/components/workspace/ReadOnlyHomeHero";
import { ReadOnlyFinancialPanel } from "@/components/workspace/ReadOnlyFinancialPanel";
import { useAppActiveRefresh } from "@/hooks/use-app-active-refresh";
import { currentAuthSession, signOut, useAuthSession } from "@/services/auth-session";
import { canApplyOwnerRequest, selectVisibleOwnerSnapshot, type OwnerWorkspaceSnapshot } from "@/services/owner-workspace-snapshot";
import { loadAccountWorkspace, type AccountWorkspaceOverview } from "@/services/account-workspace";
import { loadAccountReconciliation, type AccountReconciliationReadiness } from "@/services/account-reconciliation";
import { buildReadinessJourney } from "@/services/account-readiness-journey";
import { useDemoSession } from "@/store/demo-session";
import { colors, layout, radius, spacing, typography } from "@/theme";

type Tab = "home" | "pockets" | "activity" | "profile";
const copy = {
  home: { title: "Your money, in focus.", eyebrow: "PERSONAL HOME", description: "Your signed-in workspace. Balances and financial controls remain unavailable until account, wallet ownership and provider readiness are independently confirmed." },
  pockets: { title: "Money pockets.", eyebrow: "POCKETS", description: "Give your money a purpose when ownership and account readiness are independently verified. Pockets are not separate bank deposits." },
  activity: { title: "Your activity.", eyebrow: "ACTIVITY", description: "Financial memory depends on actual provider-backed evidence. No past transactions are inferred from offline examples." },
  profile: { title: "Account and readiness.", eyebrow: "PROFILE", description: "A secure view of what MONIFlow knows and what it still needs to verify." }
};

/** Production-only account workspace. No BMONI calls or monetary amount reads. */
export function AuthenticatedWorkspace({ tab }: { tab: Tab }) {
  const auth = useAuthSession();
  const clearDemo = useDemoSession(state => state.clearSession);
  const [snapshot, setSnapshot] = useState<OwnerWorkspaceSnapshot | null>(null);
  const requestSequence = useRef(0);
  const title = copy[tab];

  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    const subjectId = auth?.userId;
    if (!subjectId) {
      setSnapshot(null);
      return;
    }
    const isCurrent = () => canApplyOwnerRequest(
      subjectId, currentAuthSession()?.userId, sequence, requestSequence.current
    );
    setSnapshot({
      subjectId, busy: true, overview: null, reconciliation: null,
      error: null, reconciliationError: null
    });

    try {
      const next = await loadAccountWorkspace();
      if (!isCurrent() || next.userId.toLowerCase() !== subjectId.toLowerCase()) return;
      setSnapshot(previous => previous?.subjectId === subjectId
        ? { ...previous, overview: next }
        : previous);

      // Identity review remains a separate owner-bound GET, Profile only.
      if (tab === "profile") {
        try {
          const status = await loadAccountReconciliation(next);
          if (isCurrent()) {
            setSnapshot(previous => previous?.subjectId === subjectId
              ? { ...previous, reconciliation: status }
              : previous);
          }
        } catch (cause) {
          if (isCurrent()) {
            setSnapshot(previous => previous?.subjectId === subjectId
              ? {
                  ...previous,
                  reconciliationError: cause instanceof Error ? cause.message : "Identity review unavailable."
                }
              : previous);
          }
        }
      }
    } catch (cause) {
      if (isCurrent()) {
        setSnapshot(previous => previous?.subjectId === subjectId
          ? { ...previous, error: cause instanceof Error ? cause.message : "Unable to verify your workspace." }
          : previous);
      }
    } finally {
      if (isCurrent()) {
        setSnapshot(previous => previous?.subjectId === subjectId
          ? { ...previous, busy: false }
          : previous);
      }
    }
  }, [auth?.userId, tab]);

  useEffect(() => {
    void refresh();
    return () => { requestSequence.current += 1; };
  }, [refresh]);
  useAppActiveRefresh(refresh);

  const leave = () => {
    requestSequence.current += 1;
    setSnapshot(null);
    signOut();
    clearDemo();
    router.replace("/auth/sign-in");
  };

  // The previous account's state must never be rendered while React is
  // transitioning between sessions or invalidating an in-flight request.
  const visible = selectVisibleOwnerSnapshot(auth?.userId, snapshot);
  const overview = visible?.overview ?? null;
  const reconciliation = visible?.reconciliation ?? null;
  const error = visible?.error ?? null;
  const reconciliationError = visible?.reconciliationError ?? null;
  const busy = visible?.busy ?? Boolean(auth?.userId);

  const recorded = overview?.mapping === "recorded";
  const ownerWallet = overview?.wallet === "recorded_not_reverified";
  const journey = tab === "profile" ? buildReadinessJourney(overview, reconciliation) : null;
  const reviewState = reconciliation?.reconciliation;
  const reviewLabel = !reviewState ? "NOT VERIFIED"
    : reviewState === "manual_review_required" ? "MANUAL REVIEW"
    : reviewState === "unverified_mapping" ? "UNVERIFIED" : "EVIDENCE NEEDED";
  const reviewDetail = reviewState === "manual_review_required"
    ? "An unresolved local BMONI provisioning record requires independent manual review. Do not retry or link this identity automatically."
    : reviewState === "unverified_mapping"
      ? "A mapping exists locally, but BMONI account ownership and identity evidence have not been verified."
      : reviewState === "identity_evidence_required"
        ? "No BMONI identity is linked to this account. Provider-approved ownership evidence is required before any account linking."
        : "Identity reconciliation has not been confirmed for this signed-in account.";

  return (
    <Screen contentContainerStyle={styles.page}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>{title.eyebrow} · AUTHENTICATED</Text>
        <Text style={styles.title}>{title.title}</Text>
        <Text style={styles.copy}>{title.description}</Text>
        <StatusPill
          label={busy ? "CHECKING YOUR ACCOUNT" : overview ? "MONIFLOW SESSION CHECKED" : "READINESS UNAVAILABLE"}
          tone={busy || overview ? "processing" : "warning"}
        />
      </View>

      {tab === "home" ? (
        <ReadOnlyHomeHero checking={busy} onOpenPractice={() => router.push("/learn")} />
      ) : null}

      <SoftCard style={styles.card}>
        <Text style={styles.label}>SIGNED-IN IDENTITY</Text>
        <Text style={styles.headline}>{auth?.email || "MONIFlow account"}</Text>
        <Text style={styles.copy}>{overview
          ? "The API recognized your authenticated user ID. It has not confirmed a provider wallet or financial balance."
          : "We need a verified API response before showing personal workspace readiness."}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <SecondaryButton disabled={busy} onPress={() => void refresh()}>
          {busy ? "Checking…" : "Refresh account status"}
        </SecondaryButton>
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.label}>ACCOUNT READINESS</Text>
        <Readiness label="BMONI identity mapping"
          detail={overview ? recorded ? "A provider mapping is recorded for your signed-in user; independent verification remains pending." : "No BMONI mapping is recorded for this account." : "Status not available"}
          pill={overview ? recorded ? "RECORDED" : "NOT LINKED" : "UNKNOWN"} />
        <View style={styles.divider} />
        <Readiness label="Managed CNGN wallet"
          detail={overview ? ownerWallet ? "A local wallet ownership record exists; device ownership has not been reverified." : "No verified wallet ownership is available." : "Status not available"}
          pill={overview && ownerWallet ? "NOT REVERIFIED" : "NOT READY"} />
        <View style={styles.divider} />
        <Readiness label="Nigerian KYC"
          detail="Not checked by this workspace view. A successful sign-in is not KYC approval."
          pill="NOT CHECKED" />
        <View style={styles.divider} />
        <Readiness label="Provider balance and activity"
          detail="Withheld until account linkage, wallet ownership and provider read permissions are independently confirmed."
          pill="WITHHELD" />
      </SoftCard>

      {tab === "pockets" || tab === "activity" ? (
        <ReadOnlyFinancialPanel
          tab={tab}
          checking={busy}
          onOpenPractice={() =>
            router.push(tab === "pockets" ? "/learn/playground" : "/demo/walkthrough")
          }
        />
      ) : null}

      {tab === "profile" ? (
        <SoftCard style={styles.card}>
          <Text style={styles.label}>BMONI IDENTITY RECONCILIATION</Text>
          <Readiness label="Account linking review" detail={reviewDetail} pill={reviewLabel} />
          <Text style={styles.copy}>
            This status checks local records only. It does not confirm provider identity, wallet ownership or KYC.
            No automatic account linking or money movement is enabled.
          </Text>
          {reconciliationError ? <Text style={styles.error}>{reconciliationError}</Text> : null}
        </SoftCard>
      ) : null}

      {tab === "profile" && journey ? (
        <SoftCard style={styles.card}>
          <Text style={styles.label}>YOUR VERIFICATION JOURNEY</Text>
          <Text style={styles.headline}>One verified step at a time.</Text>
          <Text style={styles.copy}>
            Account access, BMONI identity, device ownership, Nigeria verification, and financial access are separate checks.
            A recorded mapping never unlocks wallet signing or balances.
          </Text>
          {journey.steps.map((step, index) => (
            <View key={step.id} style={styles.journeyStep}>
              <View style={styles.journeyIndex}>
                <Text style={styles.journeyNumber}>{String(index + 1).padStart(2, "0")}</Text>
              </View>
              <View style={styles.journeyContent}>
                <Readiness label={step.title} detail={step.detail} pill={step.status} />
              </View>
            </View>
          ))}
          <View style={styles.divider} />
          <Text style={styles.label}>WHAT HAPPENS NEXT</Text>
          <Text style={styles.headline}>{journey.nextActionTitle}</Text>
          <Text style={styles.copy}>{journey.nextActionDetail}</Text>
          <Text style={styles.disclosure}>
            READ-ONLY STATUS · NO AUTOMATIC LINKING · NO FINANCIAL OPERATIONS
          </Text>
        </SoftCard>
      ) : null}

      {tab === "profile" ? (
        <SoftCard style={styles.card}>
          <Text style={styles.label}>SESSION CONTROLS</Text>
          <Text style={styles.copy}>Check the separate signed-session proof or sign out to clear this device's in-memory authentication and example workspace state.</Text>
          <SecondaryButton onPress={() => router.push("/auth/session")}>Check API session</SecondaryButton>
          <SecondaryButton onPress={leave}>Sign out</SecondaryButton>
        </SoftCard>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.disclosure}>READ-ONLY · NO PROVIDER MONEY MOVEMENT · NO WALLET KEYS ACCESSED</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push("/onboarding/welcome")}>
          <Text style={styles.link}>Back to MONIFlow welcome</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function Readiness({ label, detail, pill }: { label: string; detail: string; pill: string }) {
  return (
    <View style={styles.readiness}>
      <View style={styles.readinessHead}>
        <Text style={styles.readinessLabel}>{label}</Text>
        <Text style={styles.pill}>{pill}</Text>
      </View>
      <Text style={styles.copy}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.xl, paddingTop: spacing.xl, paddingBottom: layout.tabContentBottomInset },
  heading: { gap: spacing.sm },
  eyebrow: { ...typography.technical, color: colors.statusProcessing },
  title: { ...typography.display, color: colors.textPrimary },
  headline: { ...typography.heading, color: colors.textPrimary },
  copy: { ...typography.body, color: colors.textSecondary },
  card: { gap: spacing.md },
  label: { ...typography.technical, color: colors.statusProcessing },
  readiness: { gap: spacing.xs },
  readinessHead: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", justifyContent: "space-between" },
  readinessLabel: { ...typography.body, fontWeight: "600", color: colors.textPrimary, flex: 1 },
  pill: { ...typography.technical, color: colors.statusWarning, fontSize: 11, flexShrink: 1 },
  divider: { height: 1, backgroundColor: colors.borderSoft },
  journeyStep: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", paddingVertical: spacing.sm },
  journeyIndex: { borderColor: colors.borderSoft, borderWidth: 1, backgroundColor: colors.backgroundPrimary,
    borderRadius: radius.pill, minWidth: 36, minHeight: 36, alignItems: "center", justifyContent: "center" },
  journeyNumber: { ...typography.technical, color: colors.statusProcessing },
  journeyContent: { flex: 1, minWidth: 0 },
  error: { ...typography.caption, color: colors.statusError },
  footer: { gap: spacing.md, alignItems: "center" },
  disclosure: { ...typography.technical, textAlign: "center", color: colors.textSecondary },
  link: { ...typography.caption, color: colors.statusProcessing, fontWeight: "600" }
});
