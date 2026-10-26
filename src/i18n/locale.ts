export function resolveLocale(preferences: readonly string[] = []): string {
  for (const value of preferences) {
    try {
      const normalized = value.replace(/_/g, "-");
      if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(normalized)) continue;
      const canonical = (Intl as typeof Intl & { getCanonicalLocales?: (value: string) => string[] }).getCanonicalLocales;
      return canonical ? canonical(normalized)[0] : normalized;
    } catch { /* Try next preference. */ }
  }
  return "en";
}
export function deviceLocale(): string {
  try {
    const preferences = (require("expo-localization") as { getLocales: () => { languageTag: string }[] }).getLocales();
    if (preferences.length) return resolveLocale(preferences.map((entry) => entry.languageTag));
  } catch { /* Intl remains available in tests and older Expo clients. */ }
  const browser = typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : [];
  return resolveLocale([...browser, Intl.DateTimeFormat().resolvedOptions().locale]);
}
export type Language = "pt" | "en" | "es" | "ja" | "zh-Hans";
export type LanguagePreference = Language | "auto";
let preference: LanguagePreference = "auto";
export const supportedLanguages = ["pt", "en", "es", "ja", "zh-Hans"] as const;
export function languageForLocale(locale: string): Language {
  const base = locale.toLowerCase().split("-")[0];
  return base === "zh" ? "zh-Hans" : base === "pt" || base === "es" || base === "ja" ? base : "en";
}
export function currentLanguage(): Language { return preference === "auto" ? languageForLocale(deviceLocale()) : preference; }
export function languagePreference() { return preference; }
export function setLanguagePreference(value: LanguagePreference) { preference = value; }
export function currentLocale() { return ({ pt: "pt-BR", en: "en-US", es: "es-ES", ja: "ja-JP", "zh-Hans": "zh-CN" })[currentLanguage()]; }
export function apiLanguages(locale = currentLanguage()): string[] {
  const normalized = locale.toLowerCase();
  const base = normalized.split("-")[0];
  const api = base === "zh" ? (/hant|tw|hk|mo/.test(normalized) ? "zh-Hant" : "zh-Hans")
    : base === "ja" ? "ja-Hrkt" : base;
  return Array.from(new Set([locale, api, base, "en"]));
}
