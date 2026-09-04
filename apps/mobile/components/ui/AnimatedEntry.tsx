import type { PropsWithChildren } from "react";
import { useEffect, useRef } from "react";
import { Animated, Platform, type StyleProp, type ViewStyle } from "react-native";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { motion } from "@/theme";

type AnimatedEntryProps = PropsWithChildren<{
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function AnimatedEntry({
  children,
  delay = 0,
  distance = 10,
  style
}: AnimatedEntryProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reducedMotion ? 0 : distance)).current;

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        delay,
        duration: motion.standard,
        toValue: 1,
        useNativeDriver: Platform.OS !== "web"
      }),
      Animated.timing(translateY, {
        delay,
        duration: motion.standard,
        toValue: 0,
        useNativeDriver: Platform.OS !== "web"
      })
    ]).start();
  }, [delay, opacity, reducedMotion, translateY]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}
