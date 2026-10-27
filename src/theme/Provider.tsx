import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, useColorScheme } from "react-native";
import { types as pokemonTypes } from "../constants/pokemon";
import { createUi } from "./styles";
import {
  darkColors,
  lightColors,
  resolveTheme,
  ThemeColors,
  ThemePreference,
} from "./palette";

const STORAGE_KEY = "pokeatlas-appearance";
const darkTypes = Object.fromEntries(
  Object.entries(pokemonTypes).map(([name, type]) => {
    // Keep each type's hue, with brighter labels and a quiet tinted surface.
    const channels = [1, 3, 5].map((offset) =>
      parseInt(type.color.slice(offset, offset + 2), 16),
    );
    const color =
      "#" +
      channels
        .map((channel) =>
          Math.round(channel + (255 - channel) * 0.45)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("");
    return [name, { ...type, color, bg: type.color + "28" }];
  }),
) as typeof pokemonTypes;
type ThemeState = {
  colors: ThemeColors;
  ui: ReturnType<typeof createUi>;
  types: typeof pokemonTypes;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
};
const Context = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, updatePreference] = useState<ThemePreference>("system");
  const chosen = useRef(false);
  const saving = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (
          active &&
          !chosen.current &&
          (stored === "light" || stored === "dark" || stored === "system")
        )
          updatePreference(stored);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const setPreference = useCallback((value: ThemePreference) => {
    chosen.current = true;
    updatePreference(value);
    saving.current = saving.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, value))
      .catch(() => {});
  }, []);
  const scheme = resolveTheme(preference, system);
  const colors = scheme === "dark" ? darkColors : lightColors;
  const ui = useMemo(() => createUi(colors), [colors]);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    document.documentElement.style.colorScheme = scheme;
    document.body.style.backgroundColor = colors.bg;
  }, [scheme, colors]);
  const value = useMemo(
    () => ({
      colors,
      ui,
      types: scheme === "dark" ? darkTypes : pokemonTypes,
      isDark: scheme === "dark",
      preference,
      setPreference,
    }),
    [colors, ui, scheme, preference, setPreference],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTheme() {
  const value = useContext(Context);
  if (!value) throw new Error("useTheme requires ThemeProvider");
  return value;
}
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
