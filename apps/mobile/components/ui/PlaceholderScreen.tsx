import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme";

import { PrimaryButton, SecondaryButton } from "./Buttons";
import { Screen } from "./Screen";
import { StatusPill } from "./StatusPill";

type PlaceholderScreenProps = {
  description: string;
  eyebrow: string;
  nextHref?: Parameters<typeof router.push>[0];
  nextLabel?: string;
  title: string;
};

export function PlaceholderScreen({
  description,
  eyebrow,
  nextHref,
  nextLabel = "Continue",
  title
}: PlaceholderScreenProps) {
  return (
    <Screen contentContainerStyle={styles.screen} scroll={false}>
      <View style={styles.copy}>
        <StatusPill label={eyebrow} tone="processing" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={styles.actions}>
        {nextHref ? (
          <PrimaryButton onPress={() => router.push(nextHref)}>{nextLabel}</PrimaryButton>
        ) : null}
        {router.canGoBack() ? (
          <SecondaryButton onPress={() => router.back()}>Back</SecondaryButton>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "space-between",
    paddingBottom: spacing.xxl,
    paddingTop: spacing.giant
  },
  copy: {
    gap: spacing.lg
  },
  title: {
    ...typography.display,
    color: colors.textPrimary
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    maxWidth: 440
  },
  actions: {
    gap: spacing.sm
  }
});
