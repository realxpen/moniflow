import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { bmoniDevice } from "@/services/bmoni-device";
import { restoreAuthSession } from "@/services/auth-session";
import { colors } from "@/theme";

bmoniDevice.initialize({ pinLength: 6, requirePin: true });

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [authReady, setAuthReady] = useState(
    () => process.env.EXPO_PUBLIC_MONIFLOW_PWA_PREVIEW !== "1"
  );
  useEffect(() => {
    if (process.env.EXPO_PUBLIC_MONIFLOW_PWA_PREVIEW !== "1") return;
    let active = true;
    // Gate the first navigation so Safari does not redirect a stored account
    // to /auth/sign-in before Supabase refresh identity has been verified.
    void restoreAuthSession().finally(() => {
      if (active) setAuthReady(true);
    });
    return () => { active = false; };
  }, []);

  if (!authReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{
            flex: 1, justifyContent: "center", alignItems: "center",
            backgroundColor: colors.backgroundPrimary, padding: 24
          }}>
            <Text style={{ color: colors.textPrimary }}>
              Checking your MONIFlow session…
            </Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              animation: "fade",
              contentStyle: { backgroundColor: colors.backgroundPrimary },
              headerShown: false
            }}
          />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
