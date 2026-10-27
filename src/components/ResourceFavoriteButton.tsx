import React from "react";
import { Pressable } from "react-native";
import { Heart } from "lucide-react-native";
import { useTheme } from "../theme";
import {
  isFavoriteResource,
  useSavedResources,
} from "../store/resourceFavorites";

export function ResourceFavoriteButton({
  resource,
  id,
  name,
}: {
  resource: string;
  id: string;
  name: string;
}) {
  const { colors: c } = useTheme();
  const { entries, toggle } = useSavedResources();
  if (!isFavoriteResource(resource)) return null;
  const saved = entries.some(
    (entry) => entry.resource === resource && entry.id === id,
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        saved ? "Remover dos favoritos" : "Adicionar aos favoritos"
      }
      accessibilityState={{ selected: saved }}
      hitSlop={6}
      onPress={(event) => {
        event.stopPropagation();
        toggle({ resource, id, name });
      }}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 22,
        backgroundColor: saved ? c.accentSoft : c.surfaceAlt,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Heart
        size={20}
        color={saved ? c.accent : c.muted}
        fill={saved ? c.accent : "transparent"}
      />
    </Pressable>
  );
}
