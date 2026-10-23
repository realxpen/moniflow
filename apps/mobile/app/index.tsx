import { Redirect } from "expo-router";
import { Platform } from "react-native";

export default function IndexScreen() {
  if (Platform.OS === "web") {
    // Home Screen preview enters the real app, not the marketing page.
    // Production web remains the existing landing page by default.
    return <Redirect href={process.env.EXPO_PUBLIC_MONIFLOW_PWA_PREVIEW === "1" ? "/onboarding/welcome" : "/landing"} />;
  }

  return <Redirect href="/onboarding/welcome" />;
}
