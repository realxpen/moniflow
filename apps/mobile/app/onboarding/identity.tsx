import { router } from "expo-router";
import { useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";

import { FlowHeader, PrimaryButton, Screen, SoftCard, StatusPill } from "@/components/ui";
import { colors, radius, spacing, typography } from "@/theme";

export default function IdentityScreen() {
  const [firstName, setFirstName] = useState("Ayomide");
  const [email, setEmail] = useState("ayomide@example.com");

  const continueOnboarding = () => {
    router.push(
      Platform.OS === "web" ? "/onboarding/wallet" : "/onboarding/wallet-native"
    );
  };

  return (
    <Screen contentContainerStyle={styles.screen} scroll={false}>
      <View style={styles.content}>
        <FlowHeader
          description="This form demonstrates the intended setup rhythm. It does not submit to BMONI."
          eyebrow="01 · IDENTITY PREVIEW"
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
          <StatusPill label="LOCAL UI ONLY" tone="warning" />
        </SoftCard>
      </View>
      <PrimaryButton onPress={continueOnboarding}>Continue</PrimaryButton>
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
  }
});
