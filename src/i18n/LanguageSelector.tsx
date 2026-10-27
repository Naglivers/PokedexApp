import React, { useState, useSyncExternalStore } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Check, Globe, X } from "lucide-react-native";
import { useTheme } from "../theme";
import { currentLanguage, LanguagePreference } from "./locale";
import {
  chooseLanguage,
  languagePreference,
  subscribeTranslations,
  translated,
  translationSnapshot,
} from "./translation";
const languages: { value: LanguagePreference; label: string; short: string }[] =
  [
    { value: "auto", label: "Automático", short: "Auto" },
    { value: "pt", label: "Português", short: "PT" },
    { value: "en", label: "English", short: "EN" },
    { value: "es", label: "Español", short: "ES" },
    { value: "ja", label: "日本語", short: "JA" },
    { value: "zh-Hans", label: "简体中文", short: "中文" },
  ];
export function LanguageSelector() {
  const { colors: c } = useTheme();
  const [open, setOpen] = useState(false);
  useSyncExternalStore(subscribeTranslations, translationSnapshot, () => 0);
  const label = languages.find(
    (item) => item.value === currentLanguage(),
  )!.short;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translated("Idioma")}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 38,
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingHorizontal: 9,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 10,
        }}
      >
        <Globe size={16} color={c.muted} />
        <Text style={{ color: c.ink, fontSize: 11, fontWeight: "700" }}>
          {label}
        </Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
            backgroundColor: c.overlay,
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 330,
              backgroundColor: c.surface,
              borderRadius: 16,
              padding: 20,
              gap: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ color: c.ink, fontSize: 18, fontWeight: "700" }}>
                {translated("Idioma")}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={translated("Fechar opções")}
                onPress={() => setOpen(false)}
                style={{ padding: 8 }}
              >
                <X size={18} color={c.muted} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {languages.map((item) => (
                <Pressable
                  key={item.value}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: item.value === languagePreference(),
                  }}
                  onPress={() => {
                    setOpen(false);
                    void chooseLanguage(item.value);
                  }}
                  style={{
                    minHeight: 48,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor:
                      item.value === languagePreference()
                        ? c.accentSoft
                        : c.surface,
                  }}
                >
                  <Text style={{ color: c.ink, fontSize: 14 }}>
                    {item.value === "auto"
                      ? translated(item.label)
                      : item.label}
                  </Text>
                  {item.value === languagePreference() && (
                    <Check size={17} color={c.accent} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
