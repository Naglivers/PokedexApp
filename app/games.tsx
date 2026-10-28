import React, { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowUpRight, Gamepad2 } from "lucide-react-native";
import {
  Button,
  Empty,
  ErrorState,
  Loading,
  Pagination,
  SearchInput,
} from "../src/components/ui";
import { useTheme } from "../src/theme";
import { indexOptions } from "../src/services/queries";
import {
  getResource,
  idFromUrl,
  type NamedResource,
} from "../src/services/api";
import { pretty } from "../src/utils/pokemon";
import { GameIcons } from "../src/features/tracker/GameIcons";
import { trackerGames } from "../src/services/gameDex";
type Group = { versions: NamedResource[]; generation: NamedResource };
export default function GamesRoute() {
  const { ui, colors: c } = useTheme();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const query = useQuery(indexOptions("version-group"));
  const records = (query.data?.results ?? []).filter((entry) =>
    entry.name.includes(search.trim().toLowerCase().replace(/[ /]+/g, "-")),
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(records.length / 18) - 1),
  );
  const visible = records.slice(currentPage * 18, (currentPage + 1) * 18);
  const details = useQueries({
    queries: visible.map((entry) => ({
      queryKey: ["resource", "version-group", idFromUrl(entry.url)],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getResource<Group>("version-group", idFromUrl(entry.url), signal),
      staleTime: 86400000,
    })),
  });
  const columns = width < 650 ? 1 : width < 1100 ? 2 : 3;
  return (
    <View style={ui.page}>
      <Text style={ui.title}>Jogos Pokémon</Text>
      <Text style={ui.subtitle}>
        Explore os conjuntos de jogos, consulte suas Pokédexes e acompanhe seus
        objetivos na Questline.
      </Text>
      <Button
        small
        variant="outline"
        onPress={() => router.push("/catalog/generation")}
      >
        Explorar gerações
      </Button>
      <SearchInput
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        placeholder="Buscar jogo: Red, Emerald, Scarlet…"
      />
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState
          retry={() => {
            void query.refetch();
          }}
        />
      ) : !records.length ? (
        <Empty title="Nenhum jogo encontrado" description="Tente outro nome." />
      ) : (
        <>
          <Text style={ui.subtitle}>{records.length} conjuntos de jogos</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -7 }}>
            {visible.map((entry, index) => (
              <View
                key={entry.url}
                style={{ width: `${100 / columns}%`, padding: 7 }}
              >
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={"Abrir Pokémon " + pretty(entry.name)}
                  onPress={() =>
                    router.push(
                      "/catalog/version-group/" + idFromUrl(entry.url),
                    )
                  }
                  style={({ pressed }) => [
                    ui.panel,
                    { gap: 16, minHeight: 190, opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <View style={ui.between}>
                    {details[index].data ? (
                      <GameIcons
                        versions={details[index].data.versions.map(
                          (version) => version.name,
                        )}
                        size={52}
                      />
                    ) : (
                      <Gamepad2 size={36} color={c.accent} />
                    )}
                    <ArrowUpRight size={18} color={c.muted} />
                  </View>
                  <Text style={ui.sectionTitle}>
                    {details[index].data?.versions
                      .map((version) => pretty(version.name))
                      .join(" / ") || pretty(entry.name)}
                  </Text>
                  {details[index].data && (
                    <Text style={ui.subtitle}>
                      Geração{" "}
                      {details[index].data.generation.name
                        .replace("generation-", "")
                        .toUpperCase()}
                    </Text>
                  )}
                  <Text
                    style={{ color: c.accent, fontSize: 12, fontWeight: "700" }}
                  >
                    Pokédexes · Regiões · Questline
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
          {records.length > 18 && (
            <Pagination
              page={currentPage}
              total={records.length}
              pageSize={18}
              setPage={setPage}
            />
          )}
        </>
      )}
      <Text style={ui.sectionTitle}>
        Questlines das expansões e Legends: Z-A
      </Text>
      <View style={{ gap: 10 }}>
        {trackerGames
          .filter((game) => game.parentGame || game.key === "legends-za")
          .map((game) => (
            <Pressable
              key={game.key}
              accessibilityRole="link"
              onPress={() => router.push("/questline/" + game.key)}
              style={[
                ui.panel,
                { flexDirection: "row", alignItems: "center", gap: 14 },
              ]}
            >
              <GameIcons versions={game.versions} size={40} />
              <Text style={[ui.sectionTitle, { flex: 1, fontSize: 15 }]}>
                {game.title}
              </Text>
              <ArrowUpRight size={18} color={c.accent} />
            </Pressable>
          ))}
      </View>
    </View>
  );
}
