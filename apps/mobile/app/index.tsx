import { Redirect } from "expo-router";
import { Platform } from "react-native";
import { useAuthSession } from "@/services/auth-session";

export default function IndexScreen() {
  const authenticated = useAuthSession();
  if (Platform.OS === "web") {
    // Home Screen preview enters the real app, not the marketing page.
    // Production web remains the existing landing page by default.
    return <Redirect href={process.env.EXPO_PUBLIC_MONIFLOW_PWA_PREVIEW === "1"\n      ? (authenticated ? "/(tabs)/home" : "/onboarding/welcome") : "/landing"} />;
  }

  return <Redirect href="/onboarding/welcome" />;
}
