import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ConfirmationButton, FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { approvePlan, getAuthorization, type AuthorizationSnapshot } from "@/services/approval";
import { colors, radius, spacing, typography } from "@/theme";

export default function ApprovalScreen() {
  const params = useLocalSearchParams<{ localUserId?: string; planId?: string }>();
  const localUserId = typeof params.localUserId === "string" ? params.localUserId : "";
  const planId = typeof params.planId === "string" ? params.planId : "";
  const [authorization, setAuthorization] = useState<AuthorizationSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const load = async () => {
    if (!localUserId || !planId) {
      setError("Authorization requires the persisted plan identity.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setAuthorization(await getAuthorization(planId, localUserId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authorization details are unavailable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [localUserId, planId]);

  const approve = async () => {
    if (!authorization || authorization.status !== "AWAITING_USER_APPROVAL") return;
    setApproving(true);
    setError(null);
    try {
      const result = await approvePlan(planId, localUserId, authorization.planHash);
      setAuthorization((current) => current ? { ...current, status: result.status } : current);
      router.push({ pathname: "/operator/signing", params: { localUserId, planId } });
    } catch (cause) {
      const typed = cause as Error & { code?: string };
      if (typed.code === "PLAN_CHANGED") {
        setError("This plan changed after review. Your approval was invalidated. Review the updated authorization and approve again.");
        await load();
      } else {
        setError(typed.message ?? "MONIFlow could not record your approval.");
      }
    } finally {
      setApproving(false);
    }
  };

  if (loading && !authorization) {
    return (
      <Screen contentContainerStyle={styles.screen}>
        <FlowHeader description="Loading the server-approved consequence snapshot." eyebrow="AUTHORIZE" title="Confirm the exact movement." />
        <SoftCard style={styles.notice}>
          <StatusPill label="LOADING" tone="processing" />
          <Text style={styles.noticeCopy}>Checking the persisted Money Plan and approval state…</Text>
        </SoftCard>
      </Screen>
    );
  }

  if (!authorization) {
    return (
      <Screen contentContainerStyle={styles.screen}>
        <FlowHeader description="The server did not expose an approvable plan." eyebrow="AUTHORIZATION GATE" title="Approval unavailable." />
        <SoftCard style={styles.notice}>
          <StatusPill label="BLOCKED" tone="warning" />
          <Text style={styles.noticeCopy}>{error ?? "Run MONI Guard before entering authorization."}</Text>
        </SoftCard>
        <PrimaryButton onPress={() => router.replace({ pathname: "/(tabs)/home", params: { localUserId } })}>Return to Home</PrimaryButton>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>AUTHORIZE</Text>
        <Text style={styles.amount}>{formatNaira(authorization.amount)}</Text>
        <Text style={styles.to}>to</Text>
        <Text style={styles.bank}>{authorization.destination.bankName}</Text>
        {authorization.destination.maskedAccountNumber ? <Text style={styles.account}>{authorization.destination.maskedAccountNumber}</Text> : null}
        {authorization.destination.accountHolderName ? <Text style={styles.holder}>{authorization.destination.accountHolderName}</Text> : null}
      </View>

      {!authorization.destination.maskedAccountNumber || !authorization.destination.accountHolderName ? (
        <SoftCard style={styles.notice}>
          <StatusPill label="DESTINATION METADATA PENDING" tone="neutral" />
          <Text style={styles.noticeCopy}>MONIFlow will show the verified account mask and account-holder name once the saved bank destination is bound to BMONI. No account details are fabricated.</Text>
        </SoftCard>
      ) : null}

      <View style={styles.warningCard}>
        <Text style={styles.warning}>{authorization.warning}</Text>
        <View style={styles.divider} />
        <Text style={styles.availableLabel}>Available afterwards</Text>
        <Text style={styles.available}>{formatNaira(authorization.availableAfter)}</Text>
      </View>

      {authorization.status === "AWAITING_USER_APPROVAL" ? (
        <ConfirmationButton disabled={approving} label={approving ? "Recording approval…" : `Approve ${formatNaira(authorization.amount)}`} onPress={() => void approve()} />
      ) : (
        <>
          <SoftCard style={styles.notice}>
            <StatusPill label="APPROVED" tone="success" />
            <Text style={styles.noticeCopy}>The server has recorded approval for this exact plan fingerprint.</Text>
          </SoftCard>
          <PrimaryButton onPress={() => router.push({ pathname: "/operator/signing", params: { localUserId, planId } })}>Continue to device signing</PrimaryButton>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.disclosure}>Approval does not move money and does not create a BMONI proposal or signature. If the amount or destination changes, this approval becomes invalid.</Text>
    </Screen>
  );
}

function formatNaira(amount: number) {
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingBottom: spacing.xxl },
  header: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  eyebrow: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.8 },
  amount: { ...typography.hero, color: colors.textPrimary, fontSize: 64, lineHeight: 70 },
  to: { ...typography.body, color: colors.textSecondary },
  bank: { ...typography.display, color: colors.textPrimary, textAlign: "center" },
  account: { ...typography.section, color: colors.textPrimary },
  holder: { ...typography.body, color: colors.textSecondary },
  warningCard: { backgroundColor: colors.surfaceStrong, borderRadius: radius.card, gap: spacing.lg, padding: spacing.xl },
  warning: { ...typography.heading, color: colors.textInverse },
  divider: { backgroundColor: colors.borderInverseSoft, height: 1 },
  availableLabel: { ...typography.technical, color: colors.backgroundSecondary },
  available: { ...typography.display, color: colors.textInverse },
  notice: { gap: spacing.sm },
  noticeCopy: { ...typography.caption, color: colors.textSecondary },
  error: { ...typography.body, color: colors.statusError, textAlign: "center" },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
