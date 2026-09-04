import { StyleSheet, Text, View } from "react-native";

import { ActivityRow } from "@/components/activity";
import { Screen, SectionTitle, StatusPill } from "@/components/ui";
import { mockDisclosure, mockHomeData } from "@/constants/mockData";
import { colors, layout, radius, spacing, typography } from "@/theme";

export default function ActivityScreen() {
  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>CALM MODE</Text>
          <Text style={styles.title}>Activity</Text>
          <Text style={styles.description}>A clear memory of what MONIFlow prepared and organized.</Text>
        </View>
        <StatusPill label="PREVIEW" tone="warning" />
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>SOURCE LABELS</Text>
        <Text style={styles.legendCopy}>
          INT means MONIFlow bookkeeping. Provider-confirmed movement will be labeled separately
          once connected.
        </Text>
      </View>

      <View style={styles.section}>
        <SectionTitle eyebrow="TODAY" title="Static activity" />
        {mockHomeData.activity.map((item) => (
          <ActivityRow key={item.label} {...item} />
        ))}
        <ActivityRow
          amount="₦0"
          label="Demo plan viewed"
          meta="No transfer or allocation executed"
          source="internal"
        />
      </View>
      <Text style={styles.disclosure}>{mockDisclosure}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxxl, paddingBottom: layout.tabContentBottomInset, paddingTop: spacing.xl },
  header: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  copy: { flex: 1, gap: spacing.xs },
  eyebrow: { ...typography.technical, color: colors.textSecondary },
  title: { ...typography.display, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary },
  legend: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg
  },
  legendTitle: { ...typography.technical, color: colors.statusProcessing },
  legendCopy: { ...typography.caption, color: colors.textSecondary },
  section: { gap: spacing.xs },
  disclosure: { ...typography.technical, color: colors.textSecondary, textAlign: "center" }
});
