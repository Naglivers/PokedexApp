import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useQueries } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ChevronDown,
  ChevronRight,
  Gamepad2,
  MapPin,
  ScanLine,
  Sparkles,
  Swords,
} from "lucide-react-native";
import { Badge, Button, Pagination, SearchInput } from "../../components/ui";
import { PokemonGrid } from "../../components/PokemonCard";
import { ResourceLink } from "../../components/ResourceData";
import { getByUrl, idFromUrl, type NamedResource } from "../../services/api";
import { useTheme } from "../../theme";
import { localText, pretty } from "../../utils/pokemon";
import { GameIcons } from "../tracker/GameIcons";

export type GenerationData = {
  id: number;
  name: string;
  names?: { name: string; language: NamedResource }[];
  main_region: NamedResource;
  pokemon_species: NamedResource[];
  moves: NamedResource[];
  types: NamedResource[];
  abilities: NamedResource[];
  version_groups: NamedResource[];
};
export const regionMaps: Record<string, number> = {
  hisui: require("../../../assets/maps/hisui.png"),
  kanto: require("../../../assets/maps/kanto.png"),
  johto: require("../../../assets/maps/johto.png"),
  hoenn: require("../../../assets/maps/hoenn.png"),
  sinnoh: require("../../../assets/maps/sinnoh.png"),
  unova: require("../../../assets/maps/unova.png"),
  kalos: require("../../../assets/maps/kalos.png"),
  alola: require("../../../assets/maps/alola.png"),
  galar: require("../../../assets/maps/galar.png"),
  paldea: require("../../../assets/maps/paldea.png"),
};
export function GenerationDetail({ data }: { data: GenerationData }) {
  const { ui, colors: c } = useTheme();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const compact = width < 700;
  const title =
    localText(data.names, "name") ||
    "Geração " + data.name.replace("generation-", "").toUpperCase();
  const stats = [
    { label: "Pokémon", count: data.pokemon_species.length, Icon: ScanLine },
    {
      label: "Grupos de jogos",
      count: data.version_groups.length,
      Icon: Gamepad2,
    },
    { label: "Golpes", count: data.moves.length, Icon: Swords },
    { label: "Tipos", count: data.types.length, Icon: Sparkles },
  ];
  return (
    <View style={{ gap: 26 }}>
      <View
        style={[
          ui.panel,
          { padding: compact ? 22 : 30, gap: 24, overflow: "hidden" },
        ]}
      >
        <View
          style={{
            flexDirection: compact ? "column" : "row",
            gap: 24,
            alignItems: compact ? "stretch" : "center",
          }}
        >
          <View style={{ flex: 1, gap: 12 }}>
            <Text style={[ui.label, { color: c.accent, letterSpacing: 2 }]}>
              JOGOS E GERAÇÕES
            </Text>
            <Text style={[ui.title, { fontSize: compact ? 30 : 38 }]}>
              {title}
            </Text>
            <Text style={[ui.body, { fontSize: 15, lineHeight: 24 }]}>
              Conheça os Pokémon, os jogos e as novidades introduzidas nesta
              geração.
            </Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={
                "Explorar a região " + pretty(data.main_region.name)
              }
              onPress={() =>
                router.push(
                  "/catalog/region/" + idFromUrl(data.main_region.url),
                )
              }
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderRadius: 20,
                backgroundColor: c.accentSoft,
              }}
            >
              <MapPin size={16} color={c.accent} />
              <Text
                style={{ color: c.accent, fontSize: 13, fontWeight: "700" }}
              >
                {pretty(data.main_region.name)}
              </Text>
              <ChevronRight size={14} color={c.accent} />
            </Pressable>
          </View>
          {regionMaps[data.main_region.name] && (
            <View
              style={{
                width: compact ? "100%" : 250,
                height: 150,
                backgroundColor: c.surfaceAlt,
                borderRadius: 16,
                overflow: "hidden",
                padding: 8,
              }}
            >
              <Image
                accessibilityLabel={
                  "Região de " + pretty(data.main_region.name)
                }
                source={regionMaps[data.main_region.name]}
                resizeMode="contain"
                style={{ width: "100%", height: "100%" }}
              />
            </View>
          )}
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
        title="Pokémon desta geração"
        subtitle={data.pokemon_species.length + " espécies para explorar"}
        Icon={ScanLine}
        initialOpen
      >
        <GenerationEntries
          key={data.id + ":pokemon"}
          entries={data.pokemon_species}
          pokemon
        />
      </GenerationSection>
      <GenerationSection
        title="Jogos desta geração"
        subtitle="Edições e grupos de jogos"
        Icon={Gamepad2}
        initialOpen
      >
        <GenerationGames entries={data.version_groups} />
      </GenerationSection>
      <GenerationSection
        title="Tipos desta geração"
        subtitle={data.types.length + " tipos introduzidos"}
        Icon={Sparkles}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {data.types.map((type) => (
            <Badge
              key={type.name}
              name={type.name}
              onPress={() =>
                router.push("/catalog/type/" + idFromUrl(type.url))
              }
            />
          ))}
        </View>
      </GenerationSection>
      <GenerationSection
        title="Golpes desta geração"
        subtitle={data.moves.length + " golpes introduzidos"}
        Icon={Swords}
      >
        <GenerationEntries key={data.id + ":moves"} entries={data.moves} />
      </GenerationSection>
      {!!data.abilities.length && (
        <GenerationSection
          title="Habilidades desta geração"
          subtitle={data.abilities.length + " habilidades introduzidas"}
          Icon={Sparkles}
        >
          <GenerationEntries
            key={data.id + ":abilities"}
            entries={data.abilities}
          />
        </GenerationSection>
      )}
    </View>
  );
}
export function GenerationSection({
  title,
  subtitle,
  Icon,
  initialOpen = false,
  children,
}: {
  title: string;
  subtitle: string;
  Icon: typeof ScanLine;
  initialOpen?: boolean;
  children: React.ReactNode;
}) {
  const { ui, colors: c } = useTheme();
  const [open, setOpen] = useState(initialOpen);
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          padding: 20,
          backgroundColor: pressed ? c.surfaceHover : c.surface,
        })}
      >
        <View
          style={{
            padding: 10,
            borderRadius: 12,
            backgroundColor: c.accentSoft,
          }}
        >
          <Icon size={21} color={c.accent} />
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={[ui.sectionTitle, { fontSize: 18 }]}>{title}</Text>
          <Text style={[ui.subtitle, { fontSize: 12 }]}>{subtitle}</Text>
        </View>
        {open ? (
          <ChevronDown size={20} color={c.accent} />
        ) : (
          <ChevronRight size={20} color={c.muted} />
        )}
      </Pressable>
      {open && (
        <View
          style={{
            padding: 16,
            gap: 16,
            borderTopWidth: 1,
            borderTopColor: c.line,
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
}
export function GenerationEntries({
  entries,
  pokemon = false,
}: {
  entries: NamedResource[];
  pokemon?: boolean;
}) {
  const { ui, colors: c } = useTheme();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) => Number(idFromUrl(a.url)) - Number(idFromUrl(b.url)),
      ),
    [entries],
  );
  const filtered = sorted.filter(
    (entry) =>
      entry.name.includes(search.trim().toLowerCase().replace(/ /g, "-")) ||
      idFromUrl(entry.url) === search.trim().replace("#", ""),
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 18) - 1),
  );
  const visible = filtered.slice(currentPage * 18, (currentPage + 1) * 18);
  return (
    <>
      <SearchInput
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        placeholder={
          pokemon
            ? "Buscar Pokémon por nome ou número…"
            : "Buscar por nome ou número…"
        }
      />
      {!filtered.length ? (
        <Text style={ui.subtitle}>Nenhum resultado encontrado.</Text>
      ) : pokemon ? (
        <PokemonGrid
          records={visible.map((entry) => ({
            name: entry.name,
            url:
              "https://pokeapi.co/api/v2/pokemon/" + idFromUrl(entry.url) + "/",
          }))}
        />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {visible.map((entry) => (
            <View
              key={entry.url}
              style={{
                flexGrow: 1,
                flexBasis: "42%",
                padding: 14,
                borderWidth: 1,
                borderColor: c.line,
                borderRadius: 10,
                backgroundColor: c.surfaceAlt,
              }}
            >
              <ResourceLink url={entry.url} name={entry.name} />
            </View>
          ))}
        </View>
      )}
      {filtered.length > 18 && (
        <Pagination
          page={currentPage}
          total={filtered.length}
          pageSize={18}
          setPage={setPage}
        />
      )}
    </>
  );
}
export function GenerationGames({ entries }: { entries: NamedResource[] }) {
  const { ui, colors: c } = useTheme();
  const router = useRouter();
  const queries = useQueries({
    queries: entries.map((entry) => ({
      queryKey: ["generation-game-group", entry.url],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getByUrl<{ versions: NamedResource[] }>(entry.url, signal),
      staleTime: 86400000,
    })),
  });
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {entries.map((entry, index) => (
        <Pressable
          key={entry.url}
          accessibilityRole="link"
          onPress={() =>
            router.push("/catalog/version-group/" + idFromUrl(entry.url))
          }
          style={({ pressed }) => ({
            flexGrow: 1,
            flexBasis: "44%",
            padding: 18,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 12,
            gap: 12,
            backgroundColor: c.surfaceAlt,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          {queries[index].data ? (
            <GameIcons
              versions={queries[index].data.versions.map(
                (version) => version.name,
              )}
              size={48}
            />
          ) : (
            <Gamepad2 size={32} color={c.accent} />
          )}
          <Text style={[ui.sectionTitle, { fontSize: 15 }]}>
            {pretty(entry.name).replace(/ And /g, " / ")}
          </Text>
          <Text style={[ui.subtitle, { fontSize: 12 }]}>
            {queries[index].data?.versions
              .map((version) => pretty(version.name))
              .join(" · ") ?? "Ver detalhes dos jogos"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
