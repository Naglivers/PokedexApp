import { Platform, StyleSheet } from "react-native";
import type { ThemeColors } from "./palette";

export const font = Platform.select({
  web: {
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  default: {},
});
export const createUi = (colors: ThemeColors) =>
  StyleSheet.create({
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
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.ink,
      minHeight: 44,
      fontSize: 13,
    },
    body: { ...font, fontSize: 13, lineHeight: 22, color: colors.body },
    number: { ...font, fontVariant: ["tabular-nums"] },
  });
