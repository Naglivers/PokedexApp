import React from "react";
import { Text } from "react-native";
import { useTheme } from "../../theme";
export default function SaveUpload(_props: {
  onSelect: (file: File) => void;
  disabled: boolean;
}) {
  const { ui } = useTheme();
  return (
    <Text style={ui.body}>
      Abra o Pokéatlas no navegador do celular ou computador para importar um
      arquivo de save.
    </Text>
  );
}
