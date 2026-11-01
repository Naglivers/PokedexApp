import React, { useRef } from "react";
import { View } from "react-native";
import { Button } from "../../components/ui";
export default function SaveUpload({
  onSelect,
  disabled,
}: {
  onSelect: (file: File) => void;
  disabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <View>
      <input
        ref={input}
        type="file"
        aria-label="Escolher arquivo de save"
        style={{ display: "none" }}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          event.target.value = "";
        }}
      />
      <Button disabled={disabled} onPress={() => input.current?.click()}>
        Escolher save
      </Button>
    </View>
  );
}
