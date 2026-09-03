import { Platform, type ViewStyle } from "react-native";

export const shadows = {
  soft: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#28232D",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.07,
      shadowRadius: 24
    },
    android: { elevation: 3 },
    default: {}
  }),
  floating: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#28232D",
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.12,
      shadowRadius: 28
    },
    android: { elevation: 6 },
    default: {}
  })
} as const;
