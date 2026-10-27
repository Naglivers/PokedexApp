import React, { useMemo } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useQueries } from "@tanstack/react-query";
import { Art, Badge, Button } from "../../components/ui";
import {
  getResource,
  idFromUrl,
  NamedResource,
  type TypeDetail,
} from "../../services/api";
import { types as typeCatalog } from "../../constants/pokemon";
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
  const typeQueries = useQueries({
    queries: Object.keys(typeCatalog).map((typeName) => ({
      queryKey: ["resource", "type", typeName],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getResource<TypeDetail>("type", typeName, signal),
      staleTime: 24 * 60 * 60 * 1000,
    })),
  });
  const pokemonTypes = useMemo(() => {
    const result = new Map<string, { name: string; slot: number }[]>();
    for (const query of typeQueries) {
      if (!query.data) continue;
      for (const entry of query.data.pokemon) {
        const id = idFromUrl(entry.pokemon.url);
        const current = result.get(id) ?? [];
        current.push({ name: query.data.name, slot: entry.slot });
        result.set(id, current);
      }
    }
    for (const entries of result.values())
      entries.sort((a, b) => a.slot - b.slot);
    return result;
  }, [typeQueries]);
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
      {typeQueries.some((query) => query.isError) && (
        <Button
          small
          variant="ghost"
          onPress={() => {
            for (const query of typeQueries)
              if (query.isError) void query.refetch();
          }}
        >
          Recarregar tipos
        </Button>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {records.map(({ pokemon: entry }) => {
          const id = idFromUrl(entry.url);
          const knownTypes = pokemonTypes.get(id) ?? [];
          const badges = knownTypes.some((type) => type.name === name)
            ? knownTypes
            : [
                ...knownTypes,
                {
                  name,
                  slot:
                    pokemon.find((p) => p.pokemon.url === entry.url)?.slot ?? 1,
                },
              ].sort((a, b) => a.slot - b.slot);
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
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}
                >
                  {badges.map((type) => (
                    <Badge key={type.name} name={type.name} />
                  ))}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
