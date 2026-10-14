import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SecondaryButton, SoftCard, StatusPill } from "@/components/ui";
import { apiFetch } from "@/services/api-fetch";
import { useAuthSession } from "@/services/auth-session";
import { loadFinancialProvider, resolveApiUrl } from "@/services/runtime";
import { useDemoSession } from "@/store/demo-session";
import { colors, radius, spacing, typography } from "@/theme";

type ProvisioningState =
  | "CREATED" | "EXISTING_LOCAL_MAPPING" | "RECONCILIATION_REQUIRED"
  | "PARTNER_ACCESS_PENDING" | "NOT_CONFIGURED" | "OUTCOME_UNKNOWN" | "NOT_CREATED";

export default function IdentityScreen() {
  const auth = useAuthSession();
  const setWorkspace = useDemoSession(state => state.setWorkspace);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [checking, setChecking] = useState(true);
  const [registrationReady, setRegistrationReady] = useState(false);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState<ProvisioningState | null>(null);
  const [supportRequestId, setSupportRequestId] = useState<string | null>(null);

  const checkPartnerAccess = async () => {
    setChecking(true);
    setProviderMessage(null);
    try {
      const provider = await loadFinancialProvider();
      const permitted = provider.provider === "bmoni" &&
        provider.status === "ok" && provider.partnerRegistrationEnabled;
      setRegistrationReady(permitted);
      if (!permitted) {
        setProviderMessage(provider.provider !== "bmoni"
          ? "The selected financial provider does not support real BMONI user creation."
          : provider.status !== "ok"
            ? provider.issue ?? "BMONI sandbox is not ready."
            : "BMONI is reachable, but new partner users cannot be created until MONIFlow receives its authorized dedicated sandbox credentials.");
      }
    } catch (cause) {
      setRegistrationReady(false);
      setProviderMessage(cause instanceof Error ? cause.message : "Partner status could not be checked.");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { void checkPartnerAccess(); }, []);

  const stopped = provisioning === "RECONCILIATION_REQUIRED" ||
    provisioning === "OUTCOME_UNKNOWN" ||
    provisioning === "PARTNER_ACCESS_PENDING" ||
    provisioning === "NOT_CONFIGURED";
  const canRegister = Boolean(auth && registrationReady && acknowledged && !stopped && !busy && !checking);

  const continueOnboarding = async () => {
    if (!auth) {
      router.replace("/auth/sign-in");
      return;
    }
    if (!canRegister) return;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim()) {
      setError("Enter every field using an identity BMONI explicitly authorizes for your partner sandbox.");
      return;
    }
    setBusy(true);
    setError(null);
    setProvisioning(null);
    try {
      const response = await apiFetch(resolveApiUrl() + "/api/onboarding/user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          localUserId: auth.userId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phoneNumber: phoneNumber.trim()
        })
      });
      const payload = await response.json() as {
        localUserId?: string;
        provisioningState?: ProvisioningState;
        retryable?: boolean;
        message?: string;
        requestId?: string;
      };
      setProvisioning(payload.provisioningState ?? null);
      setSupportRequestId(payload.requestId ?? null);
      if (!response.ok || !payload.localUserId) {
        if (response.status === 409 || payload.provisioningState === "RECONCILIATION_REQUIRED") {
          setProvisioning("RECONCILIATION_REQUIRED");
          setError("BMONI already knows this identity but MONIFlow cannot retrieve its provider user ID. Registration is paused. Ask BMONI to recover/reset the sandbox persona; do not resubmit.");
        } else if (response.status === 423 || payload.provisioningState === "PARTNER_ACCESS_PENDING") {
          setProvisioning("PARTNER_ACCESS_PENDING");
          setRegistrationReady(false);
          setError("Dedicated BMONI partner onboarding is not enabled. No provider user was created.");
        } else if (payload.retryable === false) {
          setProvisioning(payload.provisioningState ?? "OUTCOME_UNKNOWN");
          setError(payload.message ?? "The result of the BMONI request is not confirmed. Do not retry automatically.");
        } else {
          setError(payload.message ?? "BMONI did not complete sandbox user registration.");
        }
        return;
      }
      if (payload.localUserId.toLowerCase() !== auth.userId.toLowerCase()) {
        setError("The returned provider mapping does not belong to the signed-in MONIFlow account.");
        return;
      }
      setWorkspace(auth.userId, "bmoni");
      router.push({
        pathname: Platform.OS === "web" ? "/onboarding/wallet" : "/onboarding/wallet-native",
        params: { localUserId: auth.userId }
      });
    } catch (cause) {
      // A timeout may mean BMONI processed the request. Never auto-repeat creation.
      setProvisioning("OUTCOME_UNKNOWN");
      setError(cause instanceof Error ? cause.message + " Do not resubmit until the outcome is confirmed." : "Registration outcome unknown. Do not resubmit.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <FlowHeader eyebrow="01 · BMONI PARTNER SANDBOX" title="Connect a BMONI test identity."
        description="Your MONIFlow login and a BMONI sandbox persona are separate identities. This form sends an actual sandbox user-creation request only when partner registration has been enabled." />

      <SoftCard style={styles.status}>
        <StatusPill label={auth ? "MONIFLOW ACCOUNT SIGNED IN" : "MONIFLOW SIGN-IN REQUIRED"} tone={auth ? "success" : "warning"} />
        {auth ? <Text style={styles.subtle}>Signed-in MONIFlow account: {auth.email}</Text> : (
          <PrimaryButton onPress={() => router.replace("/auth/sign-in")}>Sign in first</PrimaryButton>
        )}
        <View style={styles.divider} />
        <StatusPill label={checking ? "CHECKING PARTNER ACCESS" : registrationReady ? "BMONI REGISTRATION ENABLED" : "BMONI PARTNER ACCESS PENDING"}
          tone={checking ? "processing" : registrationReady ? "success" : "warning"} />
        <Text style={styles.subtle}>
          {checking ? "Verifying onboarding permission from the API…" :
            registrationReady ? "Registration is enabled on this server. Use only test identities specifically approved by BMONI." :
              providerMessage ?? "Waiting for MONIFlow's dedicated BMONI partner sandbox credentials."}
        </Text>
      </SoftCard>

      {!checking && !registrationReady ? (
        <SoftCard style={styles.card}>
          <Text style={styles.title}>No new BMONI users for now.</Text>
          <Text style={styles.subtle}>The shared sandbox API key can confirm connectivity, but it does not prove that a test persona belongs to MONIFlow's partner account. Existing test profiles have returned 409 and require reconciliation.</Text>
          <SecondaryButton onPress={() => router.push("/demo/walkthrough")}>Explore simulated walkthrough</SecondaryButton>
          <SecondaryButton onPress={() => void checkPartnerAccess()}>Recheck partner availability</SecondaryButton>
        </SoftCard>
      ) : null}

      {registrationReady && !stopped && auth ? (
        <SoftCard style={styles.card}>
          <Text style={styles.title}>BMONI-approved test persona</Text>
          <Text style={styles.subtle}>These details belong to the BMONI sandbox identity, not your MONIFlow login. Never enter a real BVN, NIN, or an arbitrary phone number.</Text>
          <View style={styles.row}>
            <View style={styles.field}><Text style={styles.label}>FIRST NAME</Text><TextInput accessibilityLabel="Sandbox first name" autoCapitalize="words" value={firstName} onChangeText={setFirstName} style={styles.input} /></View>
            <View style={styles.field}><Text style={styles.label}>LAST NAME</Text><TextInput accessibilityLabel="Sandbox last name" autoCapitalize="words" value={lastName} onChangeText={setLastName} style={styles.input} /></View>
          </View>
          <View style={styles.field}><Text style={styles.label}>SANDBOX PERSONA EMAIL</Text><TextInput accessibilityLabel="Sandbox persona email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} /></View>
          <View style={styles.field}><Text style={styles.label}>AUTHORIZED TEST PHONE</Text><TextInput accessibilityLabel="Authorized test phone" keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} style={styles.input} /></View>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acknowledged }} onPress={() => setAcknowledged(v => !v)} style={styles.confirm}>
            <View style={[styles.checkbox, acknowledged && styles.checked]} />
            <Text style={styles.confirmText}>I have BMONI's authorization to use this partner sandbox persona. I understand that registration contacts BMONI and is not a simulation.</Text>
          </Pressable>
        </SoftCard>
      ) : null}

      {stopped ? (
        <SoftCard style={styles.card}>
          <StatusPill label={provisioning ?? "PAUSED"} tone="warning" />
          <Text style={styles.title}>Registration stopped safely.</Text>
          <Text style={styles.subtle}>Do not repeat this BMONI user-creation request. Recover/reset the persona through BMONI support before proceeding. The existing provider user ID must never be guessed.</Text>
          {supportRequestId ? <Text style={styles.subtle}>Provider request reference: {supportRequestId}</Text> : null}
          <SecondaryButton onPress={() => router.push("/demo/walkthrough")}>View the simulated walkthrough</SecondaryButton>
        </SoftCard>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton disabled={!canRegister} onPress={() => void continueOnboarding()}>
        {busy ? "Requesting partner registration…" : "Create authorized BMONI sandbox user"}
      </PrimaryButton>
      <SecondaryButton onPress={() => router.replace("/onboarding/welcome")}>Back to MONIFlow</SecondaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingBottom: spacing.xxl },
  status: { gap: spacing.md },
  card: { gap: spacing.lg },
  title: { ...typography.section, color: colors.textPrimary },
  subtle: { ...typography.body, color: colors.textSecondary },
  label: { ...typography.technical, color: colors.textSecondary },
  row: { flexDirection: "row", gap: spacing.sm },
  field: { flex: 1, gap: spacing.xs },
  input: { ...typography.body, backgroundColor: colors.backgroundPrimary, borderColor: colors.borderSoft,
    borderRadius: radius.lg, borderWidth: 1, color: colors.textPrimary, minHeight: 52, paddingHorizontal: spacing.md },
  divider: { height: 1, backgroundColor: colors.borderSoft },
  confirm: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  checkbox: { height: 22, width: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  checked: { backgroundColor: colors.statusSuccess, borderColor: colors.statusSuccess },
  confirmText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  error: { ...typography.caption, color: colors.statusError }
});
