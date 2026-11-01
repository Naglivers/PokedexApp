import React, { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useTheme } from "../../theme";
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 252,
  small = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  small?: boolean;
}) {
  const { colors: c, ui } = useTheme();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <View style={{ gap: 5, minWidth: 0, ...(!small ? { flex: 1 } : {}) }}>
      {!small && <Text style={ui.label}>{label}</Text>}
      <TextInput
        accessibilityLabel={label}
        value={draft}
        selectTextOnFocus
        keyboardType="number-pad"
        maxLength={3}
        onChangeText={(text) => {
          if (!/^\d*$/.test(text)) return;
          setDraft(text);
          if (text && Number(text) >= min && Number(text) <= max)
            onChange(Number(text));
        }}
        onBlur={() => {
          const next = Math.max(min, Math.min(max, Number(draft) || min));
          setDraft(String(next));
          onChange(next);
        }}
        style={[
          ui.input,
          {
            minHeight: 44,
            paddingHorizontal: small ? 4 : 10,
            fontSize: 16,
            textAlign: small ? "center" : "left",
            width: small ? 42 : undefined,
            color: c.ink,
          },
        ]}
      />
    </View>
  );
}
