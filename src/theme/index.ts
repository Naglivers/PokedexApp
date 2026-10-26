import { Platform, StyleSheet } from "react-native";

export const colors = {
  bg: "#F5F6F8",
  surface: "#FFFFFF",
  ink: "#202838",
  muted: "#77818F",
  line: "#E8EBEF",
  navy: "#172333",
  navyLight: "#243247",
  accent: "#E95B54",
  accentSoft: "#FFF0ED",
  green: "#328775",
  mint: "#EDF6F2",
  lavender: "#EDEAF8",
  yellow: "#F5CE70",
};
export const font = Platform.select({
  web: {
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  default: {},
});
export const ui = StyleSheet.create({
  page: {
    padding: 28,
    maxWidth: 1440,
    width: "100%",
    alignSelf: "center",
    gap: 26,
  },
  title: {
    ...font,
    fontSize: 30,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -1,
  },
  subtitle: { ...font, color: colors.muted, fontSize: 13, lineHeight: 22 },
  sectionTitle: {
    ...font,
    fontSize: 19,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.4,
  },
  label: {
    ...font,
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 1.4,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 22,
    gap: 16,
  },
  input: {
    ...font,
    borderColor: colors.line,
    borderWidth: 1,
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    minHeight: 44,
    fontSize: 13,
  },
  body: { ...font, fontSize: 13, lineHeight: 22, color: "#5F6978" },
  number: { ...font, fontVariant: ["tabular-nums"] },
});
