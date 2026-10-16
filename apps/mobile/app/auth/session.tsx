import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { signOut, useAuthSession } from "@/services/auth-session";
import { loadVerifiedApiSession, type VerifiedSessionRead } from "@/services/authenticated-readiness";
import { useDemoSession } from "@/store/demo-session";
import { colors, spacing, typography } from "@/theme";

/** Private, read-only authentication milestone. Does not access financial ledgers. */
export default function VerifiedAccountScreen() {
  const signedIn = useAuthSession();
  const clearWorkspace = useDemoSession(state => state.clearSession);
  const [verification, setVerification] = useState<VerifiedSessionRead | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const verify = useCallback(async () => {
    const version = ++requestVersion.current;
    setChecking(true);
    setVerification(null);
    setError(null);
    try {
      const read = await loadVerifiedApiSession();
      if (version === requestVersion.current) setVerification(read);
    } catch (cause) {
      if (version === requestVersion.current) {
        setError(cause instanceof Error ? cause.message : "Your session could not be verified.");
      }
    } finally {
      if (version === requestVersion.current) setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setVerification(null);
      setChecking(false);
      setError("Sign in first to verify your account.");
      return;
    }
    void verify();
    return () => { requestVersion.current += 1; };
  }, [signedIn?.userId, verify]);

  const leave = () => {
    requestVersion.current += 1;
    setVerification(null);
    signOut();
    clearWorkspace();
    router.replace("/onboarding/welcome");
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.heading}>
        <Text style={styles.technical}>MONIFLOW · AUTHENTICATED ACCESS</Text>
        <Text style={styles.title}>Your secure session.</Text>
        <Text style={styles.copy}>This checks that MONIFlow's API accepts your signed Supabase session. It does not create a wallet or authorize a financial operation.</Text>
      </View>

      <SoftCard style={styles.card}>
        <StatusPill label={checking ? "VERIFYING SESSION" : verification ? "API SESSION VERIFIED" : "SESSION NOT VERIFIED"}
          tone={verification ? "success" : checking ? "processing" : "warning"} />
        <Text style={styles.sectionTitle}>{verification ? "Signed in and recognized by the API." : "Account access check"}</Text>
        {signedIn ? <Text style={styles.copy}>Signed-in account: {signedIn.email || "Verified email unavailable"}</Text>
          : <Text style={styles.copy}>No active session.</Text>}
        {verification ? (
          <Text style={styles.copy}>Your verified user ID matches the current MONIFlow session. Provider registration, wallet ownership and Nigerian KYC have not been checked.</Text>
        ) : (
          <Text style={styles.copy}>No provider balance, saved bank, pocket, transaction or wallet is loaded until identity and provider ownership are verified separately.</Text>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {signedIn && !checking ? (
          <SecondaryButton onPress={() => void verify()}>Check API session again</SecondaryButton>
        ) : null}
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.technical}>FINANCIAL OPERATIONS</Text>
        <Text style={styles.sectionTitle}>Not enabled by signing in.</Text>
        <Text style={styles.copy}>BMONI account mapping, device-owned wallet, identity verification and real transfers each require separate provider evidence and approval. Our public synthetic test user is not linked to this account.</Text>
      </SoftCard>

      <SecondaryButton onPress={() => router.replace("/onboarding/welcome")}>Return to welcome</SecondaryButton>
      {signedIn ? <SecondaryButton onPress={leave}>Sign out and clear workspace</SecondaryButton> :
        <PrimaryButton onPress={() => router.replace("/auth/sign-in")}>Go to sign in</PrimaryButton>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  heading: { gap: spacing.md },
  technical: { ...typography.technical, color: colors.statusProcessing },
  title: { ...typography.hero, color: colors.textPrimary },
  sectionTitle: { ...typography.heading, color: colors.textPrimary },
  copy: { ...typography.body, color: colors.textSecondary },
  card: { gap: spacing.md },
  error: { ...typography.caption, color: colors.statusError }
});
