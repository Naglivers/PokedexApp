import React, { useEffect, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useQueries } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowUpRight } from "lucide-react-native";
import { useTheme } from "../src/theme";
import {
  Button,
  Empty,
  ErrorState,
  Loading,
  SearchInput,
} from "../src/components/ui";
import { indexOptions } from "../src/services/queries";
import { idFromUrl } from "../src/services/api";
import { resourceLabels } from "../src/constants/pokemon";
import { matchesName, pretty } from "../src/utils/pokemon";
import { useDebounce } from "../src/hooks/useDebounce";
import { resourcePath } from "../src/components/ResourceData";

const categories = [
  "pokemon",
  "move",
  "ability",
  "item",
  "type",
  "generation",
  "version",
  "region",
];
export default function Search() {
  const { colors: c, ui } = useTheme();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [search, setSearch] = useState(q ?? "");
  const [limit, setLimit] = useState(10);
  const query = useDebounce(search);
  const router = useRouter();
  const { width } = useWindowDimensions();
  useEffect(() => {
    setSearch(q ?? "");
    setLimit(10);
  }, [q]);
  const results = useQueries({
    queries: categories.map((resource) => ({
      ...indexOptions(resource),
      enabled: !!query.trim(),
    })),
  });
  const count = results.reduce(
    (sum, result) =>
      sum +
      (result.data?.results.filter((item) =>
        matchesName(item.name, idFromUrl(item.url), query),
      ).length ?? 0),
    0,
  );
  return (
    <View style={[ui.page, width < 650 && { padding: 18 }]}>
      <View>
        <Text style={ui.title}>O que vamos descobrir?</Text>
        <Text style={[ui.subtitle, { marginTop: 6 }]}>
          Uma busca por Pokémon, golpes, habilidades e muito mais.
        </Text>
      </View>
      <SearchInput
        value={search}
        onChange={(text) => {
          setSearch(text);
          setLimit(10);
        }}
        placeholder="Pesquise por nome ou número…"
      />
      {!query ? (
        <Empty
          title="Toda descoberta começa com uma pergunta"
          description="Digite um nome ou número para explorar as categorias."
        />
      ) : (
        <>
          <Text style={ui.subtitle}>
            {count} resultados para “{query}”
          </Text>
          {results.some((q) => q.isPending) && <Loading />}
          {results.some((q) => q.isError) && (
            <ErrorState retry={() => results.forEach((q) => q.refetch())} />
          )}
          {results.map((result, i) => {
            const matches =
              result.data?.results.filter((item) =>
                matchesName(item.name, idFromUrl(item.url), query),
              ) ?? [];
            return !matches.length ? null : (
              <View key={categories[i]} style={ui.panel}>
                <View style={ui.between}>
                  <Text style={ui.sectionTitle}>
                    {resourceLabels[categories[i]]}
                  </Text>
                  <Text style={ui.subtitle}>{matches.length}</Text>
                </View>
                <View style={ui.wrap}>
                  {matches.slice(0, limit).map((item) => (
                    <Pressable
                      accessibilityRole="link"
                      key={item.url}
                      onPress={() =>
                        router.push(
                          resourcePath(categories[i], idFromUrl(item.url)),
                        )
                      }
                      style={{
                        backgroundColor: c.bg,
                        padding: 12,
                        borderRadius: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Text style={{ color: c.ink, fontSize: 12 }}>
                        {pretty(item.name)}
                      </Text>
                      <ArrowUpRight size={13} color={c.muted} />
                    </Pressable>
                  ))}
                </View>
                {matches.length > limit && (
                  <Button
                    small
                    variant="outline"
                    onPress={() => setLimit(limit + 20)}
                  >
                    Ver mais resultados
                  </Button>
                )}
              </View>
            );
          })}
          {count === 0 && results.every((q) => q.isSuccess) && <Empty />}
        </>
      )}
    </View>
  );
}
