import { Platform, type TextStyle } from "react-native";

const editorialFont = Platform.select({ ios: "System", android: "sans-serif" });
const technicalFont = Platform.select({ ios: "Menlo", android: "monospace" });

export const typography = {
  display: {
    fontFamily: editorialFont,
    fontSize: 44,
    fontWeight: "500",
    letterSpacing: -1.5,
    lineHeight: 50
  },
  heading: {
    fontFamily: editorialFont,
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: -0.7,
    lineHeight: 34
  },
  section: {
    fontFamily: editorialFont,
    fontSize: 19,
    fontWeight: "600",
    letterSpacing: -0.2,
    lineHeight: 24
  },
  body: {
    fontFamily: editorialFont,
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24
  },
  caption: {
    fontFamily: editorialFont,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18
  },
  technical: {
    fontFamily: technicalFont,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1.1,
    lineHeight: 15,
    textTransform: "uppercase"
  }
} satisfies Record<string, TextStyle>;
