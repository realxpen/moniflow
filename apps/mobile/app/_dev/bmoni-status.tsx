import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { GlassCard, Pill, Screen, SectionTitle, StatusPill } from "@/components/ui";
import { colors, radius, spacing, typography } from "@/theme";

type BmoniStatus = {
  bmoniApi: "connected" | "disconnected";
  environment: string;
  supportedCurrencies?: string[];
  user: {
    status: "created" | "not_created" | "unknown";
    bmoniUserId: string | null;
    localUserId?: string;
  };
};

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export default function BmoniStatusScreen() {
  const [localUserId, setLocalUserId] = useState("");
  const [status, setStatus] = useState<BmoniStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const query = localUserId.trim()
        ? `?localUserId=${encodeURIComponent(localUserId.trim())}`
        : "";
      const response = await fetch(`${apiUrl}/api/dev/bmoni-status${query}`);
      const payload = (await response.json()) as BmoniStatus;
      setStatus(payload);

      if (!response.ok) {
        setError("BMONI status check failed. Check the API logs for the safe provider error.");
      }
    } catch {
      setStatus(null);
      setError("MONIFlow API could not be reached from this device.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <Pill>INTERNAL · PHASE 4</Pill>
        <Text style={styles.title}>BMONI foundation</Text>
        <Text style={styles.body}>
          Safe sandbox connectivity and persisted user mapping. No credentials are rendered here.
        </Text>
      </View>

      <GlassCard style={styles.card}>
        <SectionTitle eyebrow="PROVIDER STATUS" title="Integration check" />

        <StatusRow
          label="BMONI API"
          value={status?.bmoniApi === "connected" ? "Connected" : status ? "Disconnected" : "Not checked"}
          positive={status?.bmoniApi === "connected"}
        />
        <StatusRow label="Environment" value={status?.environment ?? "Sandbox"} />
        <StatusRow
          label="User"
          value={status?.user.status === "created" ? "Created" : "Not created"}
          positive={status?.user.status === "created"}
        />
        <StatusRow label="BMONI User ID" value={status?.user.bmoniUserId ?? "—"} mono />

        <Text style={styles.inputLabel}>LOCAL USER UUID · OPTIONAL</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setLocalUserId}
          placeholder="Paste the MONIFlow local user UUID"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={localUserId}
        />

        <Pressable disabled={loading} onPress={() => void refresh()} style={styles.button}>
          <Text style={styles.buttonText}>{loading ? "Checking…" : "Check sandbox status"}</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {status?.supportedCurrencies ? (
          <Text style={styles.meta}>
            Provider currencies: {status.supportedCurrencies.join(", ")}
          </Text>
        ) : null}
      </GlassCard>
    </Screen>
  );
}

function StatusRow({
  label,
  value,
  positive = false,
  mono = false
}: {
  label: string;
  value: string;
  positive?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {positive ? (
        <StatusPill tone="success">{value}</StatusPill>
      ) : (
        <Text style={[styles.rowValue, mono && styles.mono]} numberOfLines={1}>
          {value}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingBottom: spacing.xxxl },
  hero: { gap: spacing.md, paddingTop: spacing.lg },
  title: { ...typography.displayMedium, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary, maxWidth: 560 },
  card: { gap: spacing.lg },
  row: {
    alignItems: "center",
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    gap: spacing.md
  },
  rowLabel: { ...typography.label, color: colors.textSecondary },
  rowValue: { ...typography.body, color: colors.textPrimary, flexShrink: 1, textAlign: "right" },
  mono: { fontFamily: "monospace", fontSize: 12 },
  inputLabel: { ...typography.micro, color: colors.textMuted, marginTop: spacing.md },
  input: {
    ...typography.body,
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    minHeight: 52,
    paddingHorizontal: spacing.md
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.textPrimary,
    borderRadius: radius.full,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  buttonText: { ...typography.button, color: colors.backgroundPrimary },
  error: { ...typography.bodySmall, color: colors.statusError },
  meta: { ...typography.bodySmall, color: colors.textMuted }
});
