import React, { useEffect, useState } from "react";
import { Image } from "react-native";
import { Shield } from "lucide-react-native";
import { useTheme } from "../../theme";

const typeIds: Record<string, number> = {
  normal: 1,
  fighting: 2,
  flying: 3,
  poison: 4,
  ground: 5,
  rock: 6,
  bug: 7,
  ghost: 8,
  steel: 9,
  fire: 10,
  water: 11,
  grass: 12,
  electric: 13,
  psychic: 14,
  ice: 15,
  dragon: 16,
  dark: 17,
  fairy: 18,
};
export function TypeSymbol({
  name,
  id,
  size = 48,
  sprites,
}: {
  name: string;
  id?: number;
  size?: number;
  sprites?: unknown;
}) {
  const { colors: c, types } = useTheme();
  const nested = sprites as
    | {
        "generation-ix"?: {
          "scarlet-violet"?: { symbol_icon?: string | null };
        };
      }
    | undefined;
  const fromApi = nested?.["generation-ix"]?.["scarlet-violet"]?.symbol_icon;
  const typeId = id ?? typeIds[name];
  const uri =
    fromApi ??
    (typeId
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet/${typeId}.png`
      : undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return uri && !failed ? (
    <Image
      source={{ uri }}
      resizeMode="contain"
      accessibilityLabel={
        "Símbolo do tipo " + (types[name]?.name ?? name) + " · Scarlet / Violet"
      }
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
    />
  ) : (
    <Shield size={size} color={types[name]?.color ?? c.accent} />
  );
}
