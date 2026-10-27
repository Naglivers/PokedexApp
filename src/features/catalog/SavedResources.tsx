import React, { useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useQueries } from "@tanstack/react-query";
import { Button, Empty } from "../../components/ui";
import { useTheme } from "../../theme";
import { getResource } from "../../services/api";
import {
  useSavedResources,
  type FavoriteResource,
} from "../../store/resourceFavorites";
import { ResourceCard } from "./Catalog";

export function SavedResources({
  pokemonContent,
  pokemonCount,
}: {
  pokemonContent: React.ReactNode;
  pokemonCount: number;
}) {
  const { ui } = useTheme();
  const { width } = useWindowDimensions();
  const { entries } = useSavedResources();
  const [kind, setKind] = useState<FavoriteResource | "pokemon">("pokemon");
  const [page, setPage] = useState(0);
  const filtered = entries.filter((entry) => entry.resource === kind);
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 18) - 1),
  );
  const visible = filtered.slice(currentPage * 18, (currentPage + 1) * 18);
  const details = useQueries({
    queries: visible.map((entry) => ({
      queryKey: ["resource", entry.resource, entry.id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getResource(entry.resource, entry.id, signal),
      staleTime: 60 * 60 * 1000,
    })),
  });
  const columns = width < 650 ? 1 : width < 1100 ? 2 : 3;
  return (
    <View style={{ gap: 16 }}>
      <View style={ui.wrap}>
        {(
          [
            ["pokemon", "Pokémon"],
            ["move", "Golpes"],
            ["ability", "Habilidades"],
            ["item", "Itens"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            small
            variant={kind === value ? "primary" : "outline"}
            onPress={() => {
              setKind(value);
              setPage(0);
            }}
          >
            {label} (
            {value === "pokemon"
              ? pokemonCount
              : entries.filter((entry) => entry.resource === value).length}
            )
          </Button>
        ))}
      </View>
      {kind === "pokemon" ? (
        pokemonContent
      ) : !filtered.length ? (
        <Empty
          title="Nenhum favorito nesta categoria"
          description="Toque no coração nos catálogos ou na página de detalhes para salvar."
        />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -7 }}>
          {visible.map((entry, index) => (
            <View
              key={entry.resource + ":" + entry.id}
              style={{ width: `${100 / columns}%`, padding: 7 }}
            >
              <ResourceCard
                resource={entry.resource}
                id={entry.id}
                name={entry.name}
                data={details[index].data}
                pending={details[index].isPending}
              />
            </View>
          ))}
        </View>
      )}
      {filtered.length > 18 && (
        <View style={ui.between}>
          <Button
            small
            variant="outline"
            disabled={currentPage === 0}
            onPress={() => setPage(currentPage - 1)}
          >
            Anterior
          </Button>
          <Text style={ui.subtitle}>
            {currentPage + 1} / {Math.ceil(filtered.length / 18)}
          </Text>
          <Button
            small
            variant="outline"
            disabled={(currentPage + 1) * 18 >= filtered.length}
            onPress={() => setPage(currentPage + 1)}
          >
            Próxima
          </Button>
        </View>
      )}
    </View>
  );
}
