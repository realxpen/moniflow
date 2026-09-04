import { router } from "expo-router";
import { useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { colors, radius, spacing, typography } from "@/theme";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export default function IdentityScreen() {
  const [firstName, setFirstName] = useState("Ayomide");
  const [email, setEmail] = useState("ayomide@example.com");
  const [phoneNumber, setPhoneNumber] = useState("+2348000000000");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueOnboarding = async () => {
    if (!firstName.trim() || !email.trim() || !phoneNumber.trim()) {
      setError("First name, email, and phone are required.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/onboarding/user`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          email: email.trim().toLowerCase(),
          phoneNumber: phoneNumber.trim()
        })
      });
      const payload = (await response.json()) as {
        localUserId?: string;
        message?: string;
      };
      if (!response.ok || !payload.localUserId) {
        throw new Error(payload.message ?? "MONIFlow could not create your sandbox identity.");
      }

      router.push({
        pathname: Platform.OS === "web" ? "/onboarding/wallet" : "/onboarding/wallet-native",
        params: { localUserId: payload.localUserId }
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sandbox identity setup failed safely.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.screen} scroll={false}>
      <View style={styles.content}>
        <FlowHeader
          description="MONIFlow creates your sandbox identity and keeps its internal ID out of the normal user flow."
          eyebrow="01 · IDENTITY"
          title="First, let’s know you."
        />
        <SoftCard style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>FIRST NAME</Text>
            <TextInput
              accessibilityLabel="First name"
              autoCapitalize="words"
              onChangeText={setFirstName}
              style={styles.input}
              value={firstName}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              accessibilityLabel="Email address"
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              style={styles.input}
              value={email}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>PHONE</Text>
            <TextInput
              accessibilityLabel="Phone number"
              autoCapitalize="none"
              keyboardType="phone-pad"
              onChangeText={setPhoneNumber}
              style={styles.input}
              value={phoneNumber}
            />
          </View>
          <StatusPill label="BMONI SANDBOX" tone="processing" />
        </SoftCard>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <PrimaryButton disabled={busy} onPress={() => void continueOnboarding()}>
        {busy ? "Creating workspace…" : "Continue"}
      </PrimaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.xl,
    justifyContent: "space-between",
    paddingBottom: spacing.xxl
  },
  content: { gap: spacing.xxxl },
  form: { gap: spacing.lg },
  field: { gap: spacing.xs },
  label: { ...typography.technical, color: colors.textSecondary },
  input: {
    ...typography.body,
    backgroundColor: colors.backgroundPrimary,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.textPrimary,
    minHeight: 52,
    paddingHorizontal: spacing.md
  },
  error: { ...typography.caption, color: colors.statusError, textAlign: "center" }
});
