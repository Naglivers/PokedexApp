import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  Dna,
  Heart,
  Plus,
  Scale,
  Shuffle,
  Sparkles,
} from "lucide-react-native";
import { colors as c, font, ui } from "../../src/theme";
import {
  Art,
  Badge,
  Button,
  Empty,
  ErrorState,
  Loading,
  Select,
} from "../../src/components/ui";
import {
  PokemonDetail,
  Species,
  EvolutionChain,
  getByUrl,
  spriteUrl,
} from "../../src/services/api";
import { indexOptions, pokemonOptions } from "../../src/services/queries";
import { localText, pretty } from "../../src/utils/pokemon";
import { useFavorites } from "../../src/store/favorites";
import {
  LikeCounts,
  LikeButton,
} from "../../src/features/community/LikeButton";
import { useCollection } from "../../src/store/collection";
import { EvolutionTree } from "../../src/features/pokemon/EvolutionTree";
import {
  Stats,
  Defense,
  Abilities,
  Moves,
  Encounters,
  Sprites,
} from "../../src/features/pokemon/Panels";
import { ResourceData, ResourceLink } from "../../src/components/ResourceData";

export default function PokemonRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pokemon = useQuery(pokemonOptions(id));
  return pokemon.isPending ? (
    <Loading />
  ) : pokemon.isError ? (
    <ErrorState retry={() => pokemon.refetch()} />
  ) : (
    <PokemonContent key={pokemon.data.id} pokemon={pokemon.data} />
  );
}
function PokemonContent({ pokemon: p }: { pokemon: PokemonDetail }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const mobile = width < 700;
  const [tab, setTab] = useState("overview");
  const [shiny, setShiny] = useState(false);
  const [version, setVersion] = useState("");
  const favorite = useFavorites((state) => state.ids.includes(p.id));
  const toggle = useFavorites((state) => state.toggle);
  const collection = useCollection();
  const species = useQuery({
    queryKey: ["species-url", p.species.url],
    queryFn: ({ signal }) => getByUrl<Species>(p.species.url, signal),
  });
  const evolution = useQuery({
    queryKey: ["evolution-url", species.data?.evolution_chain?.url],
    queryFn: ({ signal }) =>
      getByUrl<EvolutionChain>(species.data!.evolution_chain!.url, signal),
    enabled: tab === "evolution" && !!species.data?.evolution_chain,
  });
  const index = useQuery(indexOptions("pokemon"));
  const position =
    index.data?.results.findIndex((item) => item.name === p.name) ?? -1;
  const sp = species.data;
  const art = p.sprites.other?.["official-artwork"];
  const teamFull =
    collection.team.length === 6 && !collection.team.includes(p.id);
  const compareFull =
    collection.compare.length === 4 && !collection.compare.includes(p.id);
  return (
    <View style={[ui.page, mobile && { padding: 18 }]}>
      <View style={ui.between}>
        <Button
          small
          variant="ghost"
          icon={<ArrowLeft size={14} color={c.muted} />}
          onPress={() => router.push("/pokedex")}
        >
          Pokédex nacional
        </Button>
        <View style={ui.row}>
          <Button
            small
            variant="outline"
            disabled={position <= 0}
            onPress={() =>
              router.push(`/pokemon/${index.data!.results[position - 1].name}`)
            }
          >
            Anterior
          </Button>
          <Button
            small
            variant="outline"
            disabled={
              position < 0 || position >= (index.data?.results.length ?? 0) - 1
            }
            onPress={() =>
              router.push(`/pokemon/${index.data!.results[position + 1].name}`)
            }
          >
            Próximo
          </Button>
        </View>
      </View>
      <View
        style={[s.hero, mobile && { flexDirection: "column", padding: 22 }]}
      >
        <View style={s.heroInfo}>
          <Text style={s.number}>
            POKÉDEX NACIONAL <Text style={{ color: "#849892" }}> / </Text> #
            {String(p.id).padStart(4, "0")}
          </Text>
          <Text style={s.name}>{pretty(p.name)}</Text>
          <Text style={s.genus}>
            {localText(sp?.genera, "genus") || pretty(p.species.name)}
          </Text>
          <View style={[ui.row, { marginTop: 16, flexWrap: "wrap" }]}>
            {p.types.map((t) => (
              <Badge
                name={t.type.name}
                key={t.type.name}
                onPress={() => router.push(`/catalog/type/${t.type.name}`)}
              />
            ))}
            {sp?.is_legendary && <Text style={s.special}>LENDÁRIO</Text>}
            {sp?.is_mythical && <Text style={s.special}>MÍTICO</Text>}
            {sp?.is_baby && <Text style={s.special}>BEBÊ</Text>}
          </View>
          <View style={[ui.row, { marginTop: 25, flexWrap: "wrap" }]}>
            <Button
              variant={favorite ? "primary" : "outline"}
              icon={
                <Heart
                  size={15}
                  color={favorite ? "#FFF" : c.accent}
                  fill={favorite ? "#FFF" : "transparent"}
                />
              }
              onPress={() => toggle(p.id)}
            >
              {favorite ? "Favoritado" : "Favoritar"}
            </Button>
            <Button
              disabled={compareFull}
              variant="outline"
              icon={<Shuffle size={15} color={c.muted} />}
              onPress={() => collection.toggleCompare(p.id)}
            >
              {collection.compare.includes(p.id)
                ? "Na comparação"
                : compareFull
                  ? "Limite: 4"
                  : "Comparar"}
            </Button>
            <Button
              disabled={teamFull}
              variant="outline"
              icon={<Plus size={15} color={c.muted} />}
              onPress={() =>
                collection.team.includes(p.id)
                  ? collection.removeTeam(p.id)
                  : collection.addTeam(p.id)
              }
            >
              {collection.team.includes(p.id)
                ? "Na equipe"
                : teamFull
                  ? "Equipe completa"
                  : "Equipe"}
            </Button>
            <LikeCounts ids={[p.id]}>
              <LikeButton pokemonId={p.id} />
            </LikeCounts>
          </View>
        </View>
        <View style={s.artArea}>
          <View style={s.artHalo} />
          <Art
            uri={
              (shiny
                ? (art?.front_shiny ?? p.sprites.front_shiny)
                : art?.front_default) ?? spriteUrl(p.id)
            }
            name={p.name}
            style={s.art}
          />
          {(art?.front_shiny || p.sprites.front_shiny) && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShiny(!shiny)}
              style={s.shiny}
            >
              <Sparkles size={12} color={shiny ? c.accent : "#80968E"} />
              <Text style={s.shinyText}>{shiny ? "Shiny" : "Ver shiny"}</Text>
            </Pressable>
          )}
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabsScroll}
        contentContainerStyle={s.tabs}
      >
        {[
          ["overview", "Visão geral"],
          ["evolution", "Evoluções"],
          ["moves", "Golpes"],
          ["encounters", "Onde encontrar"],
          ["forms", "Formas e sprites"],
          ["all", "Todos os dados"],
        ].map(([key, label]) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            key={key}
            onPress={() => setTab(key)}
            style={[s.tab, tab === key && s.tabActive]}
          >
            <Text style={[s.tabText, tab === key && { color: c.accent }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {tab === "overview" && (
        <>
          <View style={[s.columns, mobile && { flexDirection: "column" }]}>
            <View style={{ flex: 1.15, gap: 20 }}>
              <View style={ui.panel}>
                <Text style={ui.sectionTitle}>Sobre {pretty(p.name)}</Text>
                {species.isError ? (
                  <ErrorState retry={() => species.refetch()} />
                ) : species.isPending ? (
                  <Loading text="Consultando a espécie…" />
                ) : (
                  <>
                    <Text style={ui.body}>
                      {localText(
                        sp?.flavor_text_entries.filter(
                          (entry) => !version || entry.version.name === version,
                        ),
                      ) || "Descrição não disponível para este jogo."}
                    </Text>
                    {sp && (
                      <Select
                        label="Entrada da Pokédex por jogo"
                        value={version}
                        options={[
                          { value: "", label: "Descrição da Pokédex" },
                          ...Array.from(
                            new Set(
                              sp.flavor_text_entries
                                .filter(
                                  (e) =>
                                    e.language.name === "en" ||
                                    e.language.name.startsWith("pt"),
                                )
                                .map((e) => e.version.name),
                            ),
                          ).map((name) => ({
                            value: name,
                            label: pretty(name),
                          })),
                        ]}
                        onChange={setVersion}
                      />
                    )}
                    <Text style={[ui.subtitle, { fontSize: 10 }]}>
                      Textos da API, com inglês como idioma alternativo.
                    </Text>
                  </>
                )}
                <View style={s.infoGrid}>
                  {[
                    ["Altura", `${p.height / 10} m`],
                    ["Peso", `${p.weight / 10} kg`],
                    ["Experiência base", String(p.base_experience ?? "—")],
                    ["Taxa de captura", String(sp?.capture_rate ?? "—")],
                    ["Felicidade base", String(sp?.base_happiness ?? "—")],
                    ["Geração", sp ? pretty(sp.generation.name) : "—"],
                    [
                      "Habitat",
                      sp?.habitat ? pretty(sp.habitat.name) : "Não informado",
                    ],
                    ["Crescimento", sp ? pretty(sp.growth_rate.name) : "—"],
                  ].map(([label, value]) => (
                    <View key={label} style={s.infoItem}>
                      <Text style={s.infoLabel}>{label}</Text>
                      <Text style={s.infoValue}>{value}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={ui.panel}>
                <Text style={ui.sectionTitle}>Habilidades</Text>
                <Abilities pokemon={p} />
              </View>
            </View>
            <View style={{ flex: 1, gap: 20 }}>
              <View style={ui.panel}>
                <Text style={ui.sectionTitle}>Estatísticas base</Text>
                <Stats pokemon={p} />
              </View>
              <View style={ui.panel}>
                <Text style={ui.sectionTitle}>Defesas de tipo</Text>
                <Defense pokemon={p} />
              </View>
            </View>
          </View>
        </>
      )}
      {tab === "evolution" && (
        <View style={ui.panel}>
          <Text style={ui.sectionTitle}>Uma história em evolução</Text>
          <Text style={ui.subtitle}>
            Todos os ramos e condições informados pela PokéAPI.
          </Text>
          {species.isPending ||
          (evolution.isPending && !!sp?.evolution_chain) ? (
            <Loading />
          ) : species.isError || evolution.isError ? (
            <ErrorState
              retry={() => {
                species.refetch();
                if (sp?.evolution_chain) evolution.refetch();
              }}
            />
          ) : evolution.data ? (
            <EvolutionTree node={evolution.data.chain} />
          ) : (
            <Empty
              title="Cadeia não informada"
              description="Não há uma cadeia de evolução disponível para esta espécie."
            />
          )}
        </View>
      )}
      {tab === "moves" && <Moves pokemon={p} />}
      {tab === "encounters" && <Encounters pokemon={p} />}
      {tab === "forms" && (
        <>
          <View style={ui.panel}>
            <Text style={ui.sectionTitle}>Formas e variantes</Text>
            <View style={ui.wrap}>
              {sp?.varieties.map((v) => (
                <Button
                  key={v.pokemon.name}
                  variant={v.pokemon.name === p.name ? "dark" : "outline"}
                  onPress={() => router.push(`/pokemon/${v.pokemon.name}`)}
                >
                  {pretty(v.pokemon.name)}
                </Button>
              ))}
            </View>
            {p.forms.map((form) => (
              <ResourceLink key={form.name} url={form.url} name={form.name} />
            ))}
          </View>
          <Text style={ui.sectionTitle}>Galeria de sprites</Text>
          <Sprites pokemon={p} />
        </>
      )}
      {tab === "all" && (
        <>
          <Text style={ui.sectionTitle}>Pokémon: dados completos</Text>
          <ResourceData data={p as unknown as Record<string, unknown>} />
          {sp && (
            <>
              <Text style={ui.sectionTitle}>Espécie: dados completos</Text>
              <ResourceData data={sp as unknown as Record<string, unknown>} />
            </>
          )}
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  hero: {
    backgroundColor: "#E7EFEA",
    borderRadius: 19,
    padding: 32,
    flexDirection: "row",
    gap: 12,
    overflow: "hidden",
    minHeight: 280,
  },
  heroInfo: { flex: 1.6, justifyContent: "center" },
  number: {
    ...font,
    color: "#6F8D80",
    fontSize: 9,
    letterSpacing: 1.3,
    fontWeight: "600",
  },
  name: {
    ...font,
    fontSize: 44,
    color: "#2D463C",
    fontWeight: "800",
    letterSpacing: -1.6,
    marginTop: 13,
  },
  genus: { ...font, color: "#81988D", fontSize: 13, marginTop: 4 },
  special: {
    ...font,
    fontSize: 8,
    color: "#A38747",
    backgroundColor: "#FCF1D5",
    padding: 7,
    borderRadius: 6,
    fontWeight: "700",
  },
  artArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 200,
  },
  artHalo: {
    width: 220,
    height: 220,
    borderRadius: 150,
    backgroundColor: "#DCE8DF",
    position: "absolute",
  },
  art: { height: 240, width: "100%", maxWidth: 300 },
  shiny: {
    backgroundColor: "#FFFFFFB0",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  shinyText: { ...font, color: "#80968E", fontSize: 10 },
  tabsScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#DEE3E9",
  },
  tabs: { gap: 22 },
  tab: {
    paddingVertical: 15,
    paddingHorizontal: 2,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: c.accent },
  tabText: { ...font, color: c.muted, fontSize: 12, fontWeight: "600" },
  columns: { flexDirection: "row", gap: 20 },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 20,
    borderTopWidth: 1,
    borderTopColor: c.line,
    paddingTop: 20,
  },
  infoItem: { width: "50%", gap: 6 },
  infoLabel: { ...font, fontSize: 10, color: "#8D97A5" },
  infoValue: { ...font, fontSize: 13, color: c.ink, fontWeight: "600" },
});
