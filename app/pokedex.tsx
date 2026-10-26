import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import {
  Heart,
  RotateCcw,
  ScanLine,
  SlidersHorizontal,
} from "lucide-react-native";
import { colors as c, font, ui } from "../src/theme";
import {
  Badge,
  Button,
  Empty,
  ErrorState,
  Pagination,
  SearchInput,
  Select,
} from "../src/components/ui";
import { PokemonGrid, PokemonSkeletons } from "../src/components/PokemonCard";
import {
  getResource,
  getResourceList,
  idFromUrl,
  NamedResource,
  TypeDetail,
} from "../src/services/api";
import { indexOptions } from "../src/services/queries";
import { useDebounce } from "../src/hooks/useDebounce";
import { useFavorites } from "../src/store/favorites";
import { matchesName, isMegaPokemon } from "../src/utils/pokemon";
import { types } from "../src/constants/pokemon";

export default function Pokedex({ megaOnly = false }: { megaOnly?: boolean }) {
  const params = useLocalSearchParams<{ q?: string; type?: string }>();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState(params.q ?? "");
  const query = useDebounce(search);
  const [type, setType] = useState(params.type ?? "");
  const [second, setSecond] = useState("");
  const [generation, setGeneration] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState("id");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(true);
  const ids = useFavorites((state) => state.ids);
  const index = useQuery(indexOptions("pokemon"));
  const pageQuery = useQuery({
    queryKey: ["pokemon-page", page, 24],
    queryFn: ({ signal }) => getResourceList("pokemon", 24, page * 24, signal),
    enabled: false,
  });
  const typeQuery = useQuery({
    queryKey: ["type", type],
    queryFn: ({ signal }) => getResource<TypeDetail>("type", type, signal),
    enabled: !!type,
  });
  const secondQuery = useQuery({
    queryKey: ["type", second],
    queryFn: ({ signal }) => getResource<TypeDetail>("type", second, signal),
    enabled: !!second,
  });
  const genQuery = useQuery({
    queryKey: ["generation", generation],
    queryFn: ({ signal }) =>
      getResource<{ pokemon_species: NamedResource[] }>(
        "generation",
        generation,
        signal,
      ),
    enabled: !!generation,
  });
  const change = (callback: () => void) => {
    callback();
    setPage(0);
  };
  // A lista filtrada garante que formas Mega nunca apareçam na Pokédex normal.
  const active = true;
  const records = useMemo(() => {
    let list = [...(index.data?.results ?? [])].filter((item) =>
      isMegaPokemon(item.name) === megaOnly,
    );
    if (query)
      list = list.filter((item) =>
        matchesName(item.name, idFromUrl(item.url), query),
      );
    if (typeQuery.data && type) {
      const names = new Set(typeQuery.data.pokemon.map((x) => x.pokemon.name));
      list = list.filter((x) => names.has(x.name));
    }
    if (secondQuery.data && second) {
      const names = new Set(
        secondQuery.data.pokemon
          .filter((x) => x.slot === 2)
          .map((x) => x.pokemon.name),
      );
      list = list.filter((x) => names.has(x.name));
    }
    if (genQuery.data && generation) {
      const names = genQuery.data.pokemon_species.map((x) => x.name);
      list = list.filter((x) =>
        names.some((name) => x.name === name || x.name.startsWith(`${name}-`)),
      );
    }
    if (favoritesOnly)
      list = list.filter((x) => ids.includes(Number(idFromUrl(x.url))));
    list.sort((a, b) =>
      sort === "az"
        ? a.name.localeCompare(b.name)
        : sort === "za"
          ? b.name.localeCompare(a.name)
          : sort === "id-desc"
            ? Number(idFromUrl(b.url)) - Number(idFromUrl(a.url))
            : Number(idFromUrl(a.url)) - Number(idFromUrl(b.url)),
    );
    return list;
  }, [
    index.data,
    query,
    type,
    second,
    generation,
    typeQuery.data,
    secondQuery.data,
    genQuery.data,
    favoritesOnly,
    ids,
    sort,
    megaOnly,
  ]);
  const total = active
    ? records.length
    : (pageQuery.data?.count ?? index.data?.count ?? 0);
  const visible = active
    ? records.slice(page * 24, page * 24 + 24)
    : (pageQuery.data?.results ?? []);
  const pending =
    (active ? index.isPending : pageQuery.isPending) ||
    (!!type && typeQuery.isPending) ||
    (!!second && secondQuery.isPending) ||
    (!!generation && genQuery.isPending);
  const error =
    index.isError ||
    (!active && pageQuery.isError) ||
    (!!type && typeQuery.isError) ||
    (!!second && secondQuery.isError) ||
    (!!generation && genQuery.isError);
  const reset = () => {
    setSearch("");
    setType("");
    setSecond("");
    setGeneration("");
    setFavoritesOnly(false);
    setSort("id");
    setPage(0);
  };
  const options = [
    { value: "", label: "Todos os tipos" },
    ...Object.entries(types).map(([value, data]) => ({
      value,
      label: data.name,
    })),
  ];
  return (
    <View style={[ui.page, width < 650 && { padding: 18 }]}>
      <View style={ui.between}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[ui.label, { color: c.accent, marginBottom: 7 }]}>
            EXPLORE. CONHEÇA. COLECIONE.
          </Text>
          <Text style={ui.title}>{megaOnly ? "Mega Dex" : "Pokédex nacional"}</Text>
          <Text style={[ui.subtitle, { marginTop: 5 }]}>
            {megaOnly
              ? "Formas Mega Evoluídas, reunidas em um só lugar."
              : "De Bulbasaur às novas descobertas. Todos têm seu lugar aqui."}
          </Text>
        </View>
        <ScanLine size={35} strokeWidth={1} color="#BCC5D1" />
      </View>
      <View style={[ui.panel, { padding: 18, gap: 15 }]}>
        <View style={[ui.row, { flexWrap: "wrap" }]}>
          <View style={{ flex: 1, minWidth: 180 }}>
            <SearchInput
              value={search}
              onChange={(text) => change(() => setSearch(text))}
            placeholder={
              megaOnly
                ? "Pesquisar Mega Pokémon…"
                : "Nome ou número, ex.: pikachu ou 25"
            }
            />
          </View>
          <Button
            variant="outline"
            icon={<SlidersHorizontal size={15} color={c.muted} />}
            onPress={() => setShowFilters(!showFilters)}
          >
            Filtros
          </Button>
          <Button
            variant={favoritesOnly ? "primary" : "outline"}
            icon={<Heart size={15} color={favoritesOnly ? "#FFF" : c.muted} />}
            onPress={() => change(() => setFavoritesOnly(!favoritesOnly))}
          >
            {width < 600 ? "Salvos" : "Só favoritos"}
          </Button>
        </View>
        {showFilters && (
          <View style={s.filters}>
            <View style={s.filter}>
              <Text style={s.filterLabel}>TIPO</Text>
              <Select
                label="Filtrar por tipo"
                value={type}
                options={options}
                onChange={(value) => change(() => setType(value))}
              />
            </View>
            <View style={s.filter}>
              <Text style={s.filterLabel}>TIPO SECUNDÁRIO</Text>
              <Select
                label="Tipo secundário"
                value={second}
                options={[
                  { value: "", label: "Qualquer tipo secundário" },
                  ...options.slice(1),
                ]}
                onChange={(value) => change(() => setSecond(value))}
              />
            </View>
            <View style={s.filter}>
              <Text style={s.filterLabel}>GERAÇÃO</Text>
              <Select
                label="Filtrar por geração"
                value={generation}
                options={[
                  { value: "", label: "Todas as gerações" },
                  ...Array.from({ length: 9 }, (_, i) => ({
                    value: String(i + 1),
                    label: `${i + 1}ª geração`,
                  })),
                ]}
                onChange={(value) => change(() => setGeneration(value))}
              />
            </View>
            <View style={s.filter}>
              <Text style={s.filterLabel}>ORDENAR POR</Text>
              <Select
                label="Ordenar Pokémon"
                value={sort}
                options={[
                  { value: "id", label: "Número crescente" },
                  { value: "id-desc", label: "Número decrescente" },
                  { value: "az", label: "Nome A–Z" },
                  { value: "za", label: "Nome Z–A" },
                ]}
                onChange={(value) => change(() => setSort(value))}
              />
            </View>
          </View>
        )}
      </View>
      <View style={ui.between}>
        <View style={ui.row}>
          <Text style={[ui.sectionTitle, { fontSize: 15 }]}>
            {pending
              ? "Encontrando Pokémon…"
              : `${total.toLocaleString("pt-BR")} Pokémon encontrados`}
          </Text>
          {!!type && <Badge name={type} />}
        </View>
        {active && (
          <Button
            small
            variant="ghost"
            icon={<RotateCcw size={12} color={c.muted} />}
            onPress={reset}
          >
            Limpar filtros
          </Button>
        )}
      </View>
      {error ? (
        <ErrorState
          retry={() => {
            index.refetch();
            pageQuery.refetch();
            if (type) typeQuery.refetch();
            if (second) secondQuery.refetch();
            if (generation) genQuery.refetch();
          }}
        />
      ) : pending ? (
        <PokemonSkeletons />
      ) : visible.length === 0 ? (
        <Empty
          title="Nenhum Pokémon encontrado"
          action={
            <Button variant="outline" onPress={reset}>
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <>
          <PokemonGrid records={visible} />
          <Pagination page={page} total={total} setPage={setPage} />
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  filter: { flex: 1, minWidth: 155, gap: 7 },
  filterLabel: {
    ...font,
    color: "#99A1AE",
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: "600",
  },
});
