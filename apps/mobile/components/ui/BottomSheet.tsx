import type { PropsWithChildren } from "react";
import { useEffect, useRef } from "react";
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { colors, motion, radius, shadows, spacing, typography } from "@/theme";

type BottomSheetProps = PropsWithChildren<{
  onClose: () => void;
  title: string;
  visible: boolean;
}>;

export function BottomSheet({ children, onClose, title, visible }: BottomSheetProps) {
  const reducedMotion = useReducedMotion();
  const translateY = useRef(new Animated.Value(32)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      translateY.setValue(32);
      opacity.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        duration: reducedMotion ? 0 : motion.standard,
        toValue: 0,
        useNativeDriver: Platform.OS !== "web"
      }),
      Animated.timing(opacity, {
        duration: reducedMotion ? 0 : motion.quick,
        toValue: 1,
        useNativeDriver: Platform.OS !== "web"
      })
    ]).start();
  }, [opacity, reducedMotion, translateY, visible]);

  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Close sheet" onPress={onClose} style={styles.backdrop} />
        <Animated.View style={[styles.sheet, { opacity, transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    backgroundColor: "rgba(25, 24, 27, 0.32)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  sheet: {
    backgroundColor: colors.backgroundPrimary,
    borderColor: colors.borderSoft,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xl,
    paddingBottom: spacing.giant,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    ...shadows.floating
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.borderSoft,
    borderRadius: radius.pill,
    height: 4,
    width: 42
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  title: { ...typography.heading, color: colors.textPrimary },
  close: { borderRadius: radius.pill, padding: spacing.sm },
  closeLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: "600" }
});
