import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { colors, radius, spacing, typography } from "@/theme";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const configuredLocalUserId = process.env.EXPO_PUBLIC_DEV_LOCAL_USER_ID ?? "";

type NigeriaStatus = "idle" | "processing" | "ready" | "action_required" | "failed";

export default function NigeriaOnboardingScreen() {
  const params = useLocalSearchParams<{ localUserId?: string | string[] }>();
  const routedLocalUserId = Array.isArray(params.localUserId) ? params.localUserId[0] : params.localUserId;
  const localUserId = routedLocalUserId?.trim() || configuredLocalUserId;

  const [firstName, setFirstName] = useState("Bunch");
  const [lastName, setLastName] = useState("Dillon");
  const [phoneNumber, setPhoneNumber] = useState("+2348000000000");
  const [bvn, setBvn] = useState("95888168924");
  const [streetLine1, setStreetLine1] = useState("15 Admiralty Way");
  const [city, setCity] = useState("Lagos");
  const [stateName, setStateName] = useState("Lagos");
  const [postalCode, setPostalCode] = useState("101241");
  const [showSandboxDetails, setShowSandboxDetails] = useState(false);
  const [status, setStatus] = useState<NigeriaStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!localUserId) {
      setMessage("Your MONIFlow identity link is missing. Return to Identity and continue again.");
      return;
    }

    setBusy(true);
    setStatus("processing");
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/onboarding/nigeria/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          localUserId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          bvn: bvn.trim(),
          address: {
            streetLine1: streetLine1.trim(),
            city: city.trim(),
            state: stateName.trim(),
            postalCode: postalCode.trim(),
            countryCode: "NGA"
          }
        })
      });
      const payload = (await response.json()) as { status?: NigeriaStatus; message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Nigeria onboarding could not be started.");
      setStatus(payload.status ?? "processing");
      setMessage(statusMessage(payload.status ?? "processing"));
    } catch (cause) {
      setStatus("failed");
      setMessage(cause instanceof Error ? cause.message : "Nigeria onboarding failed safely.");
    } finally {
      setBusy(false);
    }
  };

  const refreshStatus = async () => {
    if (!localUserId) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/onboarding/nigeria/status?localUserId=${encodeURIComponent(localUserId)}`);
      const payload = (await response.json()) as { status?: NigeriaStatus; message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Status could not be checked.");
      setStatus(payload.status ?? "processing");
      setMessage(statusMessage(payload.status ?? "processing"));
    } catch (cause) {
      setStatus("failed");
      setMessage(cause instanceof Error ? cause.message : "Status check failed safely.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>NIGERIA · NGN</Text>
        <Text style={styles.title}>Secure your local financial rail.</Text>
        <Text style={styles.subtitle}>
          This screen is for the BMONI Nigeria NGN local-account stage only. USD enhanced due diligence is a separate later workflow.
        </Text>
      </View>

      <SoftCard style={styles.card}>
        <Text style={styles.sectionLabel}>SANDBOX IDENTITY</Text>
        <View style={styles.row}>
          <Field label="FIRST NAME" value={firstName} onChangeText={setFirstName} />
          <Field label="LAST NAME" value={lastName} onChangeText={setLastName} />
        </View>
        <Field label="PHONE" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
        <Field label="BVN" value={bvn} onChangeText={(value) => setBvn(value.replace(/\D/g, ""))} keyboardType="number-pad" secure maxLength={11} />
      </SoftCard>

      <SoftCard style={styles.card}>
        <Text style={styles.sectionLabel}>NIGERIAN ADDRESS</Text>
        <Field label="STREET LINE 1" value={streetLine1} onChangeText={setStreetLine1} />
        <View style={styles.row}>
          <Field label="CITY" value={city} onChangeText={setCity} />
          <Field label="STATE" value={stateName} onChangeText={setStateName} />
        </View>
        <View style={styles.row}>
          <Field
            label="POSTAL CODE"
            value={postalCode}
            onChangeText={(value) => setPostalCode(value.replace(/\D/g, ""))}
            keyboardType="number-pad"
            maxLength={6}
          />
          <View style={styles.field}>
            <Text style={styles.label}>COUNTRY</Text>
            <View style={styles.lockedField}>
              <Text style={styles.lockedValue}>NGA</Text>
            </View>
          </View>
        </View>

        <View style={styles.environmentRow}>
          <View>
            <Text style={styles.environmentLabel}>ENVIRONMENT</Text>
            <Text style={styles.environmentValue}>BMONI Sandbox</Text>
          </View>
          <StatusPill label={statusLabel(status)} tone={statusTone(status)} />
        </View>
      </SoftCard>

      <Pressable onPress={() => setShowSandboxDetails((value) => !value)} style={styles.disclosure}>
        <Text style={styles.disclosureText}>{showSandboxDetails ? "Hide" : "Show"} integration details</Text>
        <Text style={styles.disclosureSymbol}>{showSandboxDetails ? "−" : "+"}</Text>
      </Pressable>

      {showSandboxDetails ? (
        <SoftCard style={styles.detailsCard}>
          <Text style={styles.detailsCopy}>
            MONIFlow first performs the documented fetch-only BVN lookup, saves the NGN KYC profile, then starts Nigeria onboarding using the persisted CNGN wallet address. BMONI onboarding status remains authoritative.
          </Text>
          <Text style={styles.detailsCopy}>
            The default identity is a documented BMONI sandbox persona. Do not replace it with your real BVN/NIN while using sandbox.
          </Text>
          <Text style={styles.label}>LOCAL USER</Text>
          <Text selectable style={styles.internalId}>{localUserId ? shortId(localUserId) : "Not linked"}</Text>
        </SoftCard>
      ) : null}

      {message ? <Text style={[styles.message, status === "failed" && styles.error]}>{message}</Text> : null}

      {status === "ready" ? (
        <PrimaryButton
          onPress={() =>
            router.push({
              pathname: "/onboarding/success",
              params: { localUserId }
            })
          }
        >
          Enter MONIFlow
        </PrimaryButton>
      ) : status === "processing" || status === "action_required" ? (
        <PrimaryButton disabled={busy || !localUserId} onPress={() => void refreshStatus()}>{busy ? "Checking…" : "Check provider status"}</PrimaryButton>
      ) : (
        <PrimaryButton disabled={busy || !localUserId} onPress={() => void start()}>{busy ? "Submitting…" : "Activate Nigeria rail"}</PrimaryButton>
      )}

      <Text style={styles.privacy}>
        MONIFlow never marks Nigeria onboarding complete from local UI state. The rail becomes ready only when BMONI reports the corresponding active/ready provider state.
      </Text>
    </Screen>
  );
}

function Field({ label, value, onChangeText, keyboardType, secure, maxLength }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "phone-pad" | "number-pad";
  secure?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="words"
        autoCorrect={false}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function shortId(value: string) {
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function statusLabel(status: NigeriaStatus) {
  if (status === "ready") return "ACTIVE";
  if (status === "processing") return "PROCESSING";
  if (status === "action_required") return "ACTION REQUIRED";
  if (status === "failed") return "FAILED";
  return "SANDBOX";
}

function statusTone(status: NigeriaStatus): "neutral" | "success" | "warning" {
  if (status === "ready") return "success";
  if (status === "processing" || status === "action_required" || status === "failed") return "warning";
  return "neutral";
}

function statusMessage(status: NigeriaStatus) {
  if (status === "ready") return "BMONI reports the Nigeria NGN rail as active.";
  if (status === "action_required") return "BMONI requires another provider action. MONIFlow will not mark the rail ready until BMONI does.";
  if (status === "failed") return "BMONI reported a failed Nigeria onboarding state.";
  return "Nigeria onboarding was submitted. Check BMONI provider status until the NGN rail becomes active.";
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingBottom: spacing.xxxl },
  heading: { gap: spacing.sm, paddingTop: spacing.xl },
  eyebrow: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.5 },
  title: { ...typography.display, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  card: { gap: spacing.md },
  sectionLabel: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.2 },
  row: { flexDirection: "row", gap: spacing.sm },
  field: { flex: 1, gap: spacing.xs },
  label: { ...typography.technical, color: colors.textSecondary },
  input: {
    ...typography.body,
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.backgroundPrimary,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md
  },
  lockedField: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceGlass,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  lockedValue: { ...typography.body, color: colors.textPrimary },
  environmentRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  environmentLabel: { ...typography.technical, color: colors.textSecondary },
  environmentValue: { ...typography.body, color: colors.textPrimary },
  disclosure: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  disclosureText: { ...typography.caption, color: colors.textSecondary },
  disclosureSymbol: { ...typography.body, color: colors.textPrimary },
  detailsCard: { gap: spacing.md },
  detailsCopy: { ...typography.caption, color: colors.textSecondary },
  internalId: { ...typography.body, color: colors.textPrimary },
  message: { ...typography.caption, color: colors.textSecondary, textAlign: "center" },
  error: { color: colors.statusError },
  privacy: { ...typography.caption, color: colors.textSecondary, textAlign: "center", paddingHorizontal: spacing.md }
});
