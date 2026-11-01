import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { Button, SearchInput } from "../../components/ui";
import { useTheme } from "../../theme";
export function Picker({
  label,
  value,
  values,
  onChange,
  emptyLabel = "Nenhum",
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
  emptyLabel?: string;
}) {
  const { colors: c, ui } = useTheme();
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [limit, setLimit] = useState(60);
  const options = useMemo(
    () =>
      values.filter((value) =>
        value.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [values, search],
  );
  return (
    <View style={{ gap: 6, minWidth: 0, flex: 1 }}>
      <Text style={ui.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || emptyLabel}`}
        onPress={() => {
          setSearch("");
          setLimit(60);
          setOpen(true);
        }}
        style={[
          ui.input,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          },
        ]}
      >
        <Text numberOfLines={1} style={{ color: c.ink, fontSize: 13, flex: 1 }}>
          {value || emptyLabel}
        </Text>
        <ChevronDown size={15} color={c.muted} />
      </Pressable>
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            padding: 20,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: c.overlay,
          }}
        >
          <View
            style={[
              ui.panel,
              { width: "100%", maxWidth: 500, maxHeight: "90%" },
            ]}
          >
            <View style={ui.between}>
              <Text style={ui.sectionTitle}>{label}</Text>
              <Button small variant="ghost" onPress={() => setOpen(false)}>
                Fechar
              </Button>
            </View>
            <SearchInput
              large
              value={search}
              onChange={(text) => {
                setSearch(text);
                setLimit(60);
              }}
              placeholder={`Buscar ${label.toLowerCase()}…`}
            />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ gap: 4 }}
            >
              {options.slice(0, limit).map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={option || emptyLabel}
                  onPress={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  style={{
                    minHeight: 44,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor:
                      option === value ? c.accentSoft : c.surface,
                  }}
                >
                  <Text
                    style={{
                      color: option === value ? c.accent : c.ink,
                      fontSize: 14,
                    }}
                  >
                    {option || emptyLabel}
                  </Text>
                </Pressable>
              ))}
              {!options.length && (
                <Text style={ui.body}>Nenhum resultado.</Text>
              )}
              {options.length > limit && (
                <Button
                  small
                  variant="outline"
                  onPress={() => setLimit((current) => current + 60)}
                >
                  Ver mais opções
                </Button>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
