import React from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Art } from "../../components/ui";
import { idFromUrl, NamedResource } from "../../services/api";
import { pretty } from "../../utils/pokemon";
import { useTheme } from "../../theme";

export function TypePokemon({
  name,
  pokemon,
}: {
  name: string;
  pokemon: { slot: number; pokemon: NamedResource }[];
}) {
  const { colors: c, ui, types } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columns = width >= 1400 ? 5 : width >= 1080 ? 4 : width >= 700 ? 3 : 2;
  const records = [...pokemon].sort(
    (a, b) =>
      Number(idFromUrl(a.pokemon.url)) - Number(idFromUrl(b.pokemon.url)),
  );
  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={ui.title}>
          Pokémon do tipo {types[name]?.name ?? pretty(name)}
        </Text>
        <Text style={[ui.subtitle, { marginTop: 6 }]}>
          {records.length.toLocaleString("pt-BR")} Pokémon e formas. Toque em um
          Pokémon para abrir seus detalhes.
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {records.map(({ pokemon: entry }) => {
          const id = idFromUrl(entry.url);
          return (
            <Pressable
              key={entry.url}
              accessibilityRole="link"
              accessibilityLabel={`Ver ${pretty(entry.name)}`}
              onPress={() => router.push(`/pokemon/${id}`)}
              style={({ pressed }) => ({
                width: `${100 / columns}%`,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 12,
                paddingRight: 12,
                minHeight: 88,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Art
                name={pretty(entry.name)}
                uri={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
                style={{ width: 56, height: 56 }}
              />
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={{ color: c.ink, fontSize: 12, fontWeight: "700" }}>
                  {pretty(entry.name)}
                </Text>
                <Text style={[ui.subtitle, { fontSize: 10 }]}>
                  #{id.padStart(4, "0")}
                </Text>
                <Text
                  style={{ color: types[name]?.color ?? c.muted, fontSize: 10 }}
                >
                  {types[name]?.name ?? pretty(name)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
