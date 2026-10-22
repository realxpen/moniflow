import type { PropsWithChildren, Ref } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, layout, spacing } from "@/theme";

type ScreenProps = PropsWithChildren<{
  contentContainerStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  /** Optional ref for screens that must reset scroll position after an in-place step change. */
  scrollRef?: Ref<ScrollView>;
  scrollProps?: Omit<ScrollViewProps, "contentContainerStyle">;
}>;

export function Screen({
  children,
  contentContainerStyle,
  scroll = true,
  scrollRef,
  scrollProps
}: ScreenProps) {
  const contentStyle = [styles.content, contentContainerStyle];

  return (
    <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          {...scrollProps}
          ref={scrollRef}
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary
  },
  content: {
    alignSelf: "center",
    flexGrow: 1,
    maxWidth: layout.contentMaxWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    width: "100%"
  }
});
