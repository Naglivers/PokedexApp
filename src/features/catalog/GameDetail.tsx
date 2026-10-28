import React, { useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Gamepad2,
  MapPin,
  ScanLine,
  Swords,
  ListChecks,
} from "lucide-react-native";
import {
  Button,
  ErrorState,
  Loading,
  Pagination,
  SearchInput,
} from "../../components/ui";
import { PokemonGrid } from "../../components/PokemonCard";
import { ResourceLink } from "../../components/ResourceData";
import { getByUrl, idFromUrl, type NamedResource } from "../../services/api";
import { useTheme } from "../../theme";
import { localText, pretty } from "../../utils/pokemon";
import { GameIcons } from "../tracker/GameIcons";
import { GenerationEntries, GenerationSection } from "./GenerationDetail";
import { resolveTrackerGame, trackerGames } from "../../services/gameDex";
import { Questline } from "../games/Questline";
import { RetroGameStatus } from "../auth/RetroAchievementsLink";

type Version = {
  id: number;
  name: string;
  names?: unknown;
  version_group: NamedResource;
};
type GameGroup = {
  id: number;
  name: string;
  generation: NamedResource;
  regions: NamedResource[];
  versions: NamedResource[];
  pokedexes: NamedResource[];
  move_learn_methods: NamedResource[];
  order: number;
};
export function GameDetail({
  resource,
  data,
}: {
  resource: "version" | "version-group";
  data: Record<string, unknown>;
}) {
  const version = resource === "version" ? (data as unknown as Version) : null;
  const query = useQuery({
    queryKey: ["game-version-group", version?.version_group.url],
    queryFn: ({ signal }) =>
      getByUrl<GameGroup>(version!.version_group.url, signal),
    enabled: !!version,
    staleTime: 86400000,
  });
  if (version && query.isPending)
    return <Loading text="Carregando informações do jogo…" />;
  if (version && query.isError)
    return (
      <ErrorState
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const group = version ? query.data! : (data as unknown as GameGroup);
  return (
    <GameContent key={resource + data.id} group={group} version={version} />
  );
}
function GameContent({
  group,
  version,
}: {
  group: GameGroup;
  version: Version | null;
}) {
  const { ui, colors: c } = useTheme();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const compact = width < 700;
  const versions = version
    ? [version.name]
    : group.versions.map((entry) => entry.name);
  const title = version
    ? localText(version.names, "name") || pretty(version.name)
    : group.versions.map((entry) => pretty(entry.name)).join(" / ");
  const tracker = resolveTrackerGame(version?.name ?? group.name);
  const stats = [
    { label: "Edições", count: group.versions.length, Icon: Gamepad2 },
    { label: "Pokédexes", count: group.pokedexes.length, Icon: ScanLine },
    { label: "Regiões", count: group.regions.length, Icon: MapPin },
    {
      label: "Métodos de aprendizado",
      count: group.move_learn_methods.length,
      Icon: Swords,
    },
  ];
  return (
    <View style={{ gap: 26 }}>
      <View style={[ui.panel, { padding: compact ? 22 : 30, gap: 24 }]}>
        <View
          style={{
            flexDirection: compact ? "column" : "row",
            alignItems: compact ? "stretch" : "center",
            gap: 24,
          }}
        >
          <View style={{ flex: 1, gap: 12 }}>
            <Text style={[ui.label, { color: c.accent, letterSpacing: 2 }]}>
              JOGOS POKÉMON
            </Text>
            <Text style={[ui.title, { fontSize: compact ? 28 : 36 }]}>
              Pokémon {title}
            </Text>
            <Text style={[ui.body, { fontSize: 15, lineHeight: 24 }]}>
              Explore as edições, as regiões e os Pokémon associados a este
              jogo.
            </Text>
            <ResourceLink
              url={group.generation.url}
              name={
                "Geração " +
                group.generation.name.replace("generation-", "").toUpperCase()
              }
            />
            {tracker && (
              <View style={{ alignSelf: "flex-start" }}>
                <Button
                  small
                  variant="outline"
                  onPress={() =>
                    router.push({
                      pathname: "/dex-tracker/gamesdex",
                      params: { game: tracker.key },
                    })
                  }
                >
                  Acompanhar na Livingdex
                </Button>
              </View>
            )}
          </View>
          <View
            style={{
              backgroundColor: c.surfaceAlt,
              padding: 18,
              borderRadius: 16,
              alignItems: "center",
              maxWidth: "100%",
            }}
          >
            <GameIcons versions={versions} size={compact ? 88 : 112} />
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {stats.map(({ label, count, Icon }) => (
            <View
              key={label}
              style={{
                flexGrow: 1,
                flexBasis: compact ? "44%" : "21%",
                padding: 16,
                gap: 8,
                borderRadius: 12,
                backgroundColor: c.surfaceAlt,
              }}
            >
              <Icon size={18} color={c.accent} />
              <Text style={{ fontSize: 28, fontWeight: "800", color: c.ink }}>
                {count}
              </Text>
              <Text style={[ui.subtitle, { fontSize: 12 }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      <GenerationSection
        title="Questline"
        subtitle="História principal, pós-jogo e missões secundárias"
        Icon={ListChecks}
        initialOpen
      >
        <Questline game={group.name} />
        <RetroGameStatus game={group.name} />
      </GenerationSection>
      {trackerGames
        .filter((game) => game.parentGame === group.name)
        .map((game) => (
          <GenerationSection
            key={game.key}
            title={"Questline · " + game.title.split("—").pop()?.trim()}
            subtitle="Acompanhe a expansão separadamente do jogo principal"
            Icon={ListChecks}
          >
            <Questline game={game.key} />
          </GenerationSection>
        ))}
      <GenerationSection
        title="Pokédexes do jogo"
        subtitle="Abra uma Pokédex para explorar seus Pokémon"
        Icon={ScanLine}
        initialOpen
      >
        {group.pokedexes.length ? (
          group.pokedexes.map((dex) => (
            <GenerationSection
              key={dex.url}
              title={pretty(dex.name)}
              subtitle="Pokémon em ordem da Pokédex"
              Icon={ScanLine}
            >
              <GamePokedex dex={dex} />
            </GenerationSection>
          ))
        ) : (
          <Text style={ui.subtitle}>
            Não há uma Pokédex vinculada a este jogo no catálogo.
          </Text>
        )}
      </GenerationSection>
      <GenerationSection
        title="Edições"
        subtitle="Jogos deste conjunto"
        Icon={Gamepad2}
        initialOpen
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {group.versions.map((entry) => (
            <View
              key={entry.url}
              style={{
                flexGrow: 1,
                flexBasis: "44%",
                padding: 18,
                gap: 12,
                borderRadius: 12,
                backgroundColor: c.surfaceAlt,
              }}
            >
              <GameIcons versions={[entry.name]} size={64} />
              <ResourceLink
                url={entry.url}
                name={"Pokémon " + pretty(entry.name)}
              />
            </View>
          ))}
        </View>
      </GenerationSection>
      {!!group.regions.length && (
        <GenerationSection
          title="Regiões"
          subtitle="Conheça os cenários dos jogos"
          Icon={MapPin}
          initialOpen
        >
          <GenerationEntries entries={group.regions} />
        </GenerationSection>
      )}
      {!!group.move_learn_methods.length && (
        <GenerationSection
          title="Aprendizado de golpes"
          subtitle="Como os Pokémon aprendem golpes nestes jogos"
          Icon={Swords}
        >
          <GenerationEntries entries={group.move_learn_methods} />
        </GenerationSection>
      )}
    </View>
  );
}
export function GamePokedex({ dex }: { dex: NamedResource }) {
  const { ui } = useTheme();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["game-detail-pokedex", dex.url],
    queryFn: ({ signal }) =>
      getByUrl<{
        pokemon_entries: {
          entry_number: number;
          pokemon_species: NamedResource;
        }[];
      }>(dex.url, signal),
    staleTime: 86400000,
  });
  if (query.isPending) return <Loading text="Carregando Pokémon…" />;
  if (query.isError)
    return (
      <ErrorState
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const entries = [...query.data.pokemon_entries]
    .sort((a, b) => a.entry_number - b.entry_number)
    .filter(
      (entry) =>
        entry.pokemon_species.name.includes(
          search.trim().toLowerCase().replace(/ /g, "-"),
        ) ||
        idFromUrl(entry.pokemon_species.url) === search.trim().replace("#", ""),
    );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(entries.length / 18) - 1),
  );
  return (
    <View style={{ gap: 16 }}>
      <SearchInput
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        placeholder="Buscar Pokémon por nome ou número nacional…"
      />
      <Text style={ui.subtitle}>
        {entries.length} Pokémon · Ordem da Pokédex do jogo
      </Text>
      {entries.length ? (
        <PokemonGrid
          records={entries
            .slice(currentPage * 18, (currentPage + 1) * 18)
            .map((entry) => ({
              name: entry.pokemon_species.name,
              url:
                "https://pokeapi.co/api/v2/pokemon/" +
                idFromUrl(entry.pokemon_species.url) +
                "/",
            }))}
        />
      ) : (
        <Text style={ui.subtitle}>Nenhum Pokémon encontrado.</Text>
      )}
      {entries.length > 18 && (
        <Pagination
          page={currentPage}
          total={entries.length}
          pageSize={18}
          setPage={setPage}
        />
      )}
    </View>
  );
}
