import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { colors, radius, spacing, typography } from "@/theme";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const configuredLocalUserId = process.env.EXPO_PUBLIC_DEV_LOCAL_USER_ID ?? "";

type NigeriaStatus = "idle" | "processing" | "ready" | "action_required" | "failed";

export default function NigeriaOnboardingScreen() {
  const [firstName, setFirstName] = useState("Bunch");
  const [lastName, setLastName] = useState("Dillon");
  const [phoneNumber, setPhoneNumber] = useState("+2348000000000");
  const [email, setEmail] = useState("bunch.dillon@example.com");
  const [bvn, setBvn] = useState("95888168924");
  const [localUserId, setLocalUserId] = useState(configuredLocalUserId);
  const [showSandboxDetails, setShowSandboxDetails] = useState(!configuredLocalUserId);
  const [status, setStatus] = useState<NigeriaStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!localUserId.trim()) {
      setMessage("Add the Phase 4 local user UUID in Sandbox details before continuing.");
      setShowSandboxDetails(true);
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
          localUserId: localUserId.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
          bvn: bvn.trim()
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
    if (!localUserId.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/onboarding/nigeria/status?localUserId=${encodeURIComponent(localUserId.trim())}`);
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
        <Text style={styles.eyebrow}>IDENTITY</Text>
        <Text style={styles.title}>Let’s secure your financial workspace.</Text>
        <Text style={styles.subtitle}>A short Nigeria sandbox check. We only ask for what this rail needs.</Text>
      </View>

      <SoftCard style={styles.card}>
        <View style={styles.row}>
          <Field label="FIRST NAME" value={firstName} onChangeText={setFirstName} />
          <Field label="LAST NAME" value={lastName} onChangeText={setLastName} />
        </View>
        <Field label="PHONE" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
        <Field label="EMAIL" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="BVN" value={bvn} onChangeText={setBvn} keyboardType="number-pad" secure maxLength={11} />

        <View style={styles.environmentRow}>
          <View>
            <Text style={styles.environmentLabel}>ENVIRONMENT</Text>
            <Text style={styles.environmentValue}>Sandbox</Text>
          </View>
          <StatusPill label={statusLabel(status)} tone={statusTone(status)} />
        </View>
      </SoftCard>

      <Pressable onPress={() => setShowSandboxDetails((value) => !value)} style={styles.disclosure}>
        <Text style={styles.disclosureText}>{showSandboxDetails ? "Hide" : "Show"} sandbox details</Text>
        <Text style={styles.disclosureSymbol}>{showSandboxDetails ? "−" : "+"}</Text>
      </Pressable>

      {showSandboxDetails ? (
        <SoftCard style={styles.detailsCard}>
          <Text style={styles.detailsCopy}>This UUID links the Phase 6 request to the BMONI user and CNGN wallet created in Phases 4–5.</Text>
          <Field label="LOCAL USER UUID" value={localUserId} onChangeText={setLocalUserId} />
        </SoftCard>
      ) : null}

      {message ? <Text style={[styles.message, status === "failed" && styles.error]}>{message}</Text> : null}

      {status === "ready" ? (
        <PrimaryButton
          onPress={() =>
            router.push({
              pathname: "/onboarding/success",
              params: { localUserId: localUserId.trim() }
            })
          }
        >
          Enter MONIFlow
        </PrimaryButton>
      ) : status === "processing" || status === "action_required" ? (
        <PrimaryButton disabled={busy} onPress={() => void refreshStatus()}>{busy ? "Checking…" : "Check status"}</PrimaryButton>
      ) : (
        <PrimaryButton disabled={busy} onPress={() => void start()}>{busy ? "Securing…" : "Continue"}</PrimaryButton>
      )}

      <Text style={styles.privacy}>BVN is sent to the MONIFlow API for the BMONI sandbox verification flow and is not stored in MONIFlow’s local wallet table.</Text>
    </Screen>
  );
}

function Field({ label, value, onChangeText, keyboardType, secure, maxLength }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  secure?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
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

function statusLabel(status: NigeriaStatus) {
  if (status === "ready") return "READY";
  if (status === "processing") return "PROCESSING";
  if (status === "action_required") return "ACTION REQUIRED";
  if (status === "failed") return "CHECK FAILED";
  return "SANDBOX";
}

function statusTone(status: NigeriaStatus): "neutral" | "success" | "warning" {
  if (status === "ready") return "success";
  if (status === "processing" || status === "action_required" || status === "failed") return "warning";
  return "neutral";
}

function statusMessage(status: NigeriaStatus) {
  if (status === "ready") return "Nigeria onboarding is active. Your financial workspace is ready.";
  if (status === "action_required") return "BMONI needs another verification step. MONIFlow will not mark the rail ready until the provider does.";
  if (status === "failed") return "BMONI reported a failed onboarding state.";
  return "Identity accepted. BMONI is processing the Nigeria onboarding state.";
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingBottom: spacing.xxxl },
  heading: { gap: spacing.sm, paddingTop: spacing.xl },
  eyebrow: { ...typography.technical, color: colors.textSecondary, letterSpacing: 1.5 },
  title: { ...typography.display, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  card: { gap: spacing.md },
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
  environmentRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  environmentLabel: { ...typography.technical, color: colors.textSecondary },
  environmentValue: { ...typography.body, color: colors.textPrimary },
  disclosure: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  disclosureText: { ...typography.caption, color: colors.textSecondary },
  disclosureSymbol: { ...typography.body, color: colors.textPrimary },
  detailsCard: { gap: spacing.md },
  detailsCopy: { ...typography.caption, color: colors.textSecondary },
  message: { ...typography.caption, color: colors.textSecondary, textAlign: "center" },
  error: { color: colors.statusError },
  privacy: { ...typography.caption, color: colors.textSecondary, textAlign: "center", paddingHorizontal: spacing.md }
});
