import AsyncStorage from "@react-native-async-storage/async-storage";
import { currentLanguage, currentLocale, LanguagePreference, languagePreference, setLanguagePreference, supportedLanguages } from "./locale";
import { translateLocal } from "./translateLocal";
const listeners = new Set<() => void>();
let revision = 0;
let lastLanguage = currentLanguage();
let changedByUser = false;
const storageKey = "pokeatlas-language";
export const translationSnapshot = () => revision;
export function subscribeTranslations(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function notify() {
  revision++;
  if (typeof document !== "undefined") document.documentElement.lang = currentLocale();
  listeners.forEach((listener) => listener());
}
export function translated(text: string): string { return translateLocal(text, currentLanguage()); }
export function refreshLocale() { const next = currentLanguage(); if (next !== lastLanguage) { lastLanguage = next; notify(); } }
export async function chooseLanguage(value: LanguagePreference) {
  changedByUser = true; setLanguagePreference(value); lastLanguage = currentLanguage(); notify();
  await AsyncStorage.setItem(storageKey, value).catch(() => {});
}
export async function initializeTranslations() {
  try {
    const saved = await AsyncStorage.getItem(storageKey);
    if (!changedByUser && (saved === "auto" || supportedLanguages.includes(saved as typeof supportedLanguages[number]))) setLanguagePreference(saved as LanguagePreference);
  } catch { /* Device language still works when storage is unavailable. */ }
  lastLanguage = currentLanguage(); notify();
}
export { languagePreference };
