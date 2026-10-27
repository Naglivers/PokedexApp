import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Check, Monitor, Moon, Sun, X } from "lucide-react-native";
import { useTheme, ThemePreference } from ".";
import { translated } from "../i18n/translation";

const choices = [
  {
    value: "light",
    label: "Claro",
    description: "Cores claras para o dia a dia",
    Icon: Sun,
  },
  {
    value: "dark",
    label: "Escuro",
    description: "Mais conforto em ambientes escuros",
    Icon: Moon,
  },
  {
    value: "system",
    label: "Sistema",
    description: "Acompanhar o tema do dispositivo",
    Icon: Monitor,
  },
] as const;
export function ThemeSelector() {
  const { colors: c, ui, isDark, preference, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const Icon = preference === "system" ? Monitor : isDark ? Moon : Sun;
  const select = (value: ThemePreference) => {
    setPreference(value);
    setOpen(false);
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translated("Aparência")}
        accessibilityHint={translated(
          "Escolher tema claro, escuro ou do sistema",
        )}
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          width: 38,
          height: 38,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.surface,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Icon size={18} color={c.ink} />
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
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            backgroundColor: c.overlay,
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 380,
              borderRadius: 20,
              padding: 22,
              gap: 18,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.line,
            }}
          >
            <View style={ui.between}>
              <Text accessibilityRole="header" style={ui.sectionTitle}>
                Aparência
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={translated("Fechar opções")}
                onPress={() => setOpen(false)}
                hitSlop={10}
                style={{ padding: 8 }}
              >
                <X size={19} color={c.muted} />
              </Pressable>
            </View>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={translated("Aparência")}
              style={{ gap: 8 }}
            >
              {choices.map(
                ({ value, label, description, Icon: ChoiceIcon }) => {
                  const selected = value === preference;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityLabel={translated(label)}
                      accessibilityState={{ checked: selected }}
                      aria-checked={selected}
                      onPress={() => select(value)}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        minHeight: 70,
                        padding: 14,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: selected ? c.accent : c.line,
                        backgroundColor: selected ? c.accentSoft : c.surface,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <ChoiceIcon
                        size={21}
                        color={selected ? c.accent : c.muted}
                      />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text
                          style={{
                            color: c.ink,
                            fontSize: 14,
                            fontWeight: "700",
                          }}
                        >
                          {label}
                        </Text>
                        <Text
                          style={{
                            color: c.muted,
                            fontSize: 11,
                            lineHeight: 16,
                          }}
                        >
                          {description}
                        </Text>
                      </View>
                      {selected && <Check size={18} color={c.accent} />}
                    </Pressable>
                  );
                },
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
