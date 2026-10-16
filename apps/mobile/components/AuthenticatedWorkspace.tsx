import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { useAppActiveRefresh } from "@/hooks/use-app-active-refresh";
import { signOut, useAuthSession } from "@/services/auth-session";
import { loadAccountWorkspace, type AccountWorkspaceOverview } from "@/services/account-workspace";
import { useDemoSession } from "@/store/demo-session";
import { colors, layout, radius, spacing, typography } from "@/theme";

type Tab = "home" | "pockets" | "activity" | "profile";
const copy = {
  home: { title: "Your money, when ready.", eyebrow: "PERSONAL HOME", description: "Your signed-in MONIFlow workspace. Provider balances and controls remain unavailable until ownership is confirmed." },
  pockets: { title: "Your money spaces.", eyebrow: "POCKETS", description: "Savings goals are internal bookkeeping, not separate provider-held funds. Your private allocations are withheld until account readiness is verified." },
  activity: { title: "Your financial memory.", eyebrow: "ACTIVITY", description: "Real transactions must be confirmed by the provider. No historical financial records are inferred from the offline demonstration." },
  profile: { title: "Account and readiness.", eyebrow: "PROFILE", description: "A secure view of what MONIFlow knows and what it still needs to verify." }
};

/** Production-only account workspace. No BMONI calls or monetary amount reads. */
export function AuthenticatedWorkspace({ tab }: { tab: Tab }) {
  const auth = useAuthSession();
  const clearDemo = useDemoSession(state => state.clearSession);
  const [overview, setOverview] = useState<AccountWorkspaceOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const title = copy[tab];

  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setOverview(null);
    setError(null);
    if (!auth?.userId) {
      setBusy(false);
      setError("Sign in to load your own workspace.");
      return;
    }
    setBusy(true);
    try {
      const next = await loadAccountWorkspace();
      if (requestSequence.current === sequence && next.userId.toLowerCase() === auth.userId.toLowerCase()) {
        setOverview(next);
      }
    } catch (cause) {
      if (requestSequence.current === sequence) {
        setError(cause instanceof Error ? cause.message : "Unable to verify your workspace.");
      }
    } finally {
      if (requestSequence.current === sequence) setBusy(false);
    }
  }, [auth?.userId]);

  useEffect(() => {
    setOverview(null);
    void refresh();
    return () => { requestSequence.current += 1; };
  }, [refresh]);
  useAppActiveRefresh(refresh);

  const leave = () => {
    requestSequence.current += 1;
    setOverview(null);
    signOut();
    clearDemo();
    router.replace("/auth/sign-in");
  };

  const recorded = overview?.mapping === "recorded";
  const ownerWallet = overview?.wallet === "recorded_not_reverified";

  return (
    <Screen contentContainerStyle={styles.page}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>{title.eyebrow} · AUTHENTICATED</Text>
        <Text style={styles.title}>{title.title}</Text>
        <Text style={styles.copy}>{title.description}</Text>
        <StatusPill
          label={busy ? "CHECKING YOUR ACCOUNT" : overview ? "SIGNED-IN ACCOUNT VERIFIED" : "READINESS UNAVAILABLE"}
          tone={busy ? "processing" : overview ? "success" : "warning"}
        />
      </View>

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

      {tab === "home" ? (
        <SoftCard style={styles.card}>
          <Text style={styles.label}>YOUR WORKSPACE</Text>
          <Text style={styles.headline}>A secure starting point.</Text>
          <Text style={styles.copy}>You can explore account readiness now. Pockets and Activity will show real account-linked data only when MONIFlow has the required evidence. No simulated ₦300,000 balance is used here.</Text>
          <SecondaryButton onPress={() => router.push("/(tabs)/pockets")}>View money spaces</SecondaryButton>
          <SecondaryButton onPress={() => router.push("/(tabs)/activity")}>View activity readiness</SecondaryButton>
        </SoftCard>
      ) : null}

      {tab === "pockets" || tab === "activity" ? (
        <SoftCard style={styles.card}>
          <Text style={styles.label}>{tab === "pockets" ? "INTERNAL ALLOCATIONS" : "PROVIDER-CONFIRMED HISTORY"}</Text>
          <Text style={styles.headline}>{tab === "pockets" ? "No account-linked spaces to display yet." : "No verified history to display yet."}</Text>
          <Text style={styles.copy}>{tab === "pockets"
            ? "MONIFlow is not loading financial allocations until your identity and financial workspace are independently linked. This does not mean your allocation balance is zero."
            : "MONIFlow has not authorized a provider-backed activity read for this account. An unavailable history is not proof of zero transactions."}</Text>
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
        <Text style={styles.disclosure}>READ-ONLY · NO PROVIDER MONEY MOVEMENT · NO WALLET KEYS ON THIS SIMULATOR</Text>
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
  error: { ...typography.caption, color: colors.statusError },
  footer: { gap: spacing.md, alignItems: "center" },
  disclosure: { ...typography.technical, textAlign: "center", color: colors.textSecondary },
  link: { ...typography.caption, color: colors.statusProcessing, fontWeight: "600" }
});
