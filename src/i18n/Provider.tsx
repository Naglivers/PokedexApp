import React, { useEffect, useSyncExternalStore } from "react";
import { AppState, Platform } from "react-native";
import { currentLanguage } from "./locale";
import { initializeTranslations, refreshLocale, subscribeTranslations, translationSnapshot } from "./translation";
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  useSyncExternalStore(subscribeTranslations, translationSnapshot, () => 0);
  useEffect(() => {
    void initializeTranslations();
    const app = AppState.addEventListener("change", (state) => { if (state === "active") refreshLocale(); });
    if (Platform.OS === "web") window.addEventListener("languagechange", refreshLocale);
    return () => { app.remove(); if (Platform.OS === "web") window.removeEventListener("languagechange", refreshLocale); };
  }, []);
  return <React.Fragment key={currentLanguage()}>{children}</React.Fragment>;
}
