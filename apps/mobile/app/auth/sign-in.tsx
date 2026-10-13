import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, Screen, SecondaryButton, SoftCard } from "@/components/ui";
import { authIsConfigured, signInWithPassword, signUpWithPassword } from "@/services/auth-session";
import { useDemoSession } from "@/store/demo-session";
import { colors, radius, spacing, typography } from "@/theme";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "create">("sign-in");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const clearWorkspace = useDemoSession(state => state.clearSession);

  const submit = async () => {
    setError(null);
    setMessage(null);
    if (!email.includes("@") || password.length < 8) {
      setError("Enter a valid email and a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "create") {
        const active = await signUpWithPassword(email, password);
        if (!active) {
          setMessage("Check your email to confirm your account, then return and sign in.");
          setMode("sign-in");
          return;
        }
      } else {
        await signInWithPassword(email, password);
      }
      clearWorkspace();
      router.replace("/onboarding/welcome");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not authenticate this session.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>MONIFLOW · SECURE ACCESS</Text>
        <Text style={styles.title}>{mode === "sign-in" ? "Sign in to your workspace." : "Create your account."}</Text>
        <Text style={styles.note}>Financial data is private. Your session must be verified before MONIFlow can read or change it.</Text>
      </View>
      <SoftCard style={styles.form}>
        <Text style={styles.label}>EMAIL</Text>
        <TextInput accessibilityLabel="Account email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.field} />
        <Text style={styles.label}>PASSWORD</Text>
        <TextInput accessibilityLabel="Account password" autoCapitalize="none" secureTextEntry autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChangeText={setPassword} style={styles.field} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.note}>{message}</Text> : null}
        {!authIsConfigured() ? <Text style={styles.error}>Authentication is not yet configured for this deployment.</Text> : null}
        <PrimaryButton disabled={busy || !authIsConfigured()} onPress={() => void submit()}>{busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}</PrimaryButton>
        <SecondaryButton disabled={busy} onPress={() => { setError(null); setMessage(null); setMode(mode === "sign-in" ? "create" : "sign-in"); }}>
          {mode === "sign-in" ? "Create an account instead" : "Already have an account? Sign in"}
        </SecondaryButton>
      </SoftCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, justifyContent: "center", paddingTop: spacing.xl, paddingBottom: spacing.xl },
  heading: { gap: spacing.md },
  eyebrow: { ...typography.technical, color: colors.statusProcessing },
  title: { ...typography.display, color: colors.textPrimary },
  note: { ...typography.body, color: colors.textSecondary },
  form: { gap: spacing.md },
  label: { ...typography.technical, color: colors.textSecondary },
  field: { ...typography.body, minHeight: 52, color: colors.textPrimary, borderColor: colors.borderSoft, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.md },
  error: { ...typography.caption, color: colors.statusError }
});
