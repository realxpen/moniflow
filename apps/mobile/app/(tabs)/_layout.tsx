import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, radius, shadows, spacing, typography } from "@/theme";

const tabLabels: Record<string, string> = {
  home: "Home",
  pockets: "Pockets",
  activity: "Activity",
  profile: "Profile"
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={({ navigation, state }) => (
        <View pointerEvents="box-none" style={styles.shell}>
          <View style={styles.bar}>
            {state.routes.map((route, index) => {
              const selected = state.index === index;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={route.key}
                  onPress={() => navigation.navigate(route.name)}
                  style={({ pressed }) => [
                    styles.tab,
                    selected && styles.selectedTab,
                    pressed && styles.pressed
                  ]}
                >
                  <Text style={[styles.label, selected && styles.selectedLabel]}>
                    {tabLabels[route.name] ?? route.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textSecondary
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="pockets" options={{ title: "Pockets" }} />
      <Tabs.Screen name="activity" options={{ title: "Activity" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    bottom: spacing.sm,
    left: 0,
    paddingHorizontal: spacing.md,
    position: "absolute",
    right: 0
  },
  bar: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xxs,
    height: layout.tabBarHeight,
    maxWidth: layout.contentMaxWidth,
    padding: spacing.xs,
    width: "100%",
    ...shadows.floating
  },
  tab: {
    alignItems: "center",
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: layout.touchTarget
  },
  selectedTab: { backgroundColor: colors.accentSoft },
  label: { ...typography.caption, color: colors.textSecondary, fontWeight: "500" },
  selectedLabel: { color: colors.textPrimary, fontWeight: "700" },
  pressed: { opacity: 0.7 }
});
