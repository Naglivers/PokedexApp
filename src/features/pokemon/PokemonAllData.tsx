import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Database,
  Dna,
  Heart,
  Image as ImageIcon,
  Layers,
  Map,
  Sparkles,
  Swords,
  Volume2,
} from "lucide-react-native";
import { Art, Badge, Button, SearchInput } from "../../components/ui";
import { ResourceData } from "../../components/ResourceData";
import type { PokemonDetail, Species } from "../../services/api";
import { font, useTheme, useThemedStyles, type ThemeColors } from "../../theme";
import { normalize, pretty } from "../../utils/pokemon";
import { Stats, Sprites } from "./Panels";

type Data = Record<string, unknown>;
type Section = {
  key: string;
  title: string;
  description: string;
  Icon: typeof Database;
  pokemon: string[];
  species: string[];
};
const sections: Section[] = [
  {
    key: "audio",
    title: "Gritos e áudio",
    description:
      "Ouça o grito atual e a versão clássica do Pokémon, quando disponíveis.",
    Icon: Volume2,
    pokemon: ["cries"],
    species: [],
  },
  {
    key: "identity",
    title: "Identificação e classificação",
    description: "Nome, medidas, espécie, origem e características visuais.",
    Icon: Database,
    pokemon: [
      "id",
      "name",
      "height",
      "weight",
      "order",
      "is_default",
      "base_experience",
      "species",
    ],
    species: [
      "id",
      "name",
      "names",
      "genera",
      "generation",
      "color",
      "shape",
      "habitat",
      "is_baby",
      "is_legendary",
      "is_mythical",
      "forms_switchable",
    ],
  },
  {
    key: "battle",
    title: "Atributos e batalha",
    description:
      "Estatísticas, EVs concedidos, tipos e habilidades atuais e históricos.",
    Icon: Swords,
    pokemon: ["stats", "types", "abilities", "past_types", "past_abilities"],
    species: [],
  },
  {
    key: "capture",
    title: "Captura e reprodução",
    description:
      "Taxa de captura, amizade, gênero, ovos e curva de experiência.",
    Icon: Heart,
    pokemon: [],
    species: [
      "capture_rate",
      "base_happiness",
      "gender_rate",
      "growth_rate",
      "egg_groups",
      "hatch_counter",
      "has_gender_differences",
    ],
  },
  {
    key: "evolution",
    title: "Evolução e formas",
    description: "Cadeia evolutiva, espécie anterior e variantes disponíveis.",
    Icon: Dna,
    pokemon: ["forms"],
    species: ["evolution_chain", "evolves_from_species", "varieties"],
  },
  {
    key: "moves",
    title: "Golpes e aprendizado",
    description: "Todos os golpes, níveis e métodos de aprendizado por jogo.",
    Icon: Sparkles,
    pokemon: ["moves"],
    species: [],
  },
  {
    key: "encounters",
    title: "Encontros e itens",
    description:
      "Áreas de encontro, itens carregados e informações do Pal Park.",
    Icon: Map,
    pokemon: ["held_items", "location_area_encounters"],
    species: ["pal_park_encounters"],
  },
  {
    key: "games",
    title: "Pokédexes e jogos",
    description: "Entradas por versão, números regionais e índices dos jogos.",
    Icon: BookOpen,
    pokemon: ["game_indices"],
    species: ["pokedex_numbers", "flavor_text_entries"],
  },
  {
    key: "images",
    title: "Imagens e sprites",
    description: "Galeria normal e shiny, arte oficial e imagens por geração.",
    Icon: ImageIcon,
    pokemon: ["sprites"],
    species: [],
  },
];
function pick(data: Data, keys: string[]) {
  return Object.fromEntries(
    keys.filter((key) => key in data).map((key) => [key, data[key]]),
  );
}

export function PokemonAllData({
  pokemon,
  species,
  speciesLoading,
  speciesError,
  onRetrySpecies,
}: {
  pokemon: PokemonDetail;
  species?: Species;
  speciesLoading: boolean;
  speciesError: boolean;
  onRetrySpecies: () => void;
}) {
  const { colors: c, ui } = useTheme();
  const s = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const mobile = width < 700;
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Set<string>>(() => new Set(["identity"]));
  const groups = useMemo(() => {
    const rawPokemon = pokemon as unknown as Data;
    const rawSpecies = (species ?? {}) as unknown as Data;
    const usedPokemon = new Set(sections.flatMap((section) => section.pokemon));
    const usedSpecies = new Set(sections.flatMap((section) => section.species));
    const all = [
      ...sections,
      {
        key: "extra",
        title: "Informações adicionais",
        description: "Outros campos disponibilizados na ficha deste Pokémon.",
        Icon: Layers,
        pokemon: Object.keys(rawPokemon).filter((key) => !usedPokemon.has(key)),
        species: Object.keys(rawSpecies).filter((key) => !usedSpecies.has(key)),
      },
    ];
    return all
      .map((section) => ({
        ...section,
        pokemonData: pick(rawPokemon, section.pokemon),
        speciesData: pick(rawSpecies, section.species),
      }))
      .filter(
        (section) =>
          Object.keys(section.pokemonData).length +
            Object.keys(section.speciesData).length >
          0,
      );
  }, [pokemon, species]);
  const query = normalize(search);
  const visible = groups.filter(
    (section) =>
      !query ||
      normalize(
        [
          section.title,
          section.description,
          ...section.pokemon,
          ...section.species,
        ]
          .join(" ")
          .replace(/_/g, " "),
      ).includes(query),
  );
  const expanded = (key: string) => !!query || open.has(key);
  const fieldCount = groups.reduce(
    (sum, group) =>
      sum +
      Object.keys(group.pokemonData).length +
      Object.keys(group.speciesData).length,
    0,
  );
  const art =
    pokemon.sprites.other?.["official-artwork"]?.front_default ??
    pokemon.sprites.front_default;
  const metrics = [
    { label: "ALTURA", value: `${pokemon.height / 10} m` },
    { label: "PESO", value: `${pokemon.weight / 10} kg` },
    {
      label: "TOTAL BASE",
      value: String(
        pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0),
      ),
    },
    {
      label: "EXPERIÊNCIA BASE",
      value:
        pokemon.base_experience == null ? "—" : String(pokemon.base_experience),
    },
  ];
  return (
    <View style={{ gap: 20 }}>
      <View style={[s.hero, mobile && { padding: 18 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View style={s.art}>
            <Art
              uri={art}
              name={pretty(pokemon.name)}
              style={{ width: 76, height: 76 }}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.eyebrow}>
              FICHA COMPLETA · #
              {String(species?.id ?? pokemon.id).padStart(4, "0")}
            </Text>
            <Text style={[ui.sectionTitle, { fontSize: mobile ? 22 : 26 }]}>
              {pretty(pokemon.name)}
            </Text>
            <View style={ui.wrap}>
              {pokemon.types.map(({ type }) => (
                <Badge key={type.name} name={type.name} />
              ))}
            </View>
          </View>
        </View>
        <View style={s.metrics}>
          {metrics.map((metric) => (
            <View
              key={metric.label}
              style={[s.metric, { width: mobile ? "47%" : "23%" }]}
            >
              <Text style={s.metricLabel}>{metric.label}</Text>
              <Text style={s.metricValue}>{metric.value}</Text>
            </View>
          ))}
        </View>
        <Text style={ui.subtitle}>
          {fieldCount} campos organizados em {groups.length} seções. Explore os
          detalhes de cada assunto abaixo.
        </Text>
      </View>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar seção: captura, golpes, sprites…"
      />
      <View style={[ui.between, { flexWrap: "wrap" }]}>
        <Text style={s.sectionCount}>
          {visible.length} seções {query ? "encontradas" : "disponíveis"}
        </Text>
        <View style={ui.wrap}>
          <Button
            small
            variant="ghost"
            onPress={() => {
              setSearch("");
              setOpen(new Set(groups.map((group) => group.key)));
            }}
          >
            Expandir tudo
          </Button>
          <Button
            small
            variant="ghost"
            onPress={() => {
              setSearch("");
              setOpen(new Set());
            }}
          >
            Recolher tudo
          </Button>
        </View>
      </View>
      {speciesLoading && (
        <View style={s.notice}>
          <Text style={ui.subtitle}>Carregando as informações da espécie…</Text>
        </View>
      )}
      {speciesError && (
        <View style={s.notice}>
          <Text style={ui.subtitle}>
            Não foi possível carregar os dados da espécie.
          </Text>
          <Button small variant="outline" onPress={onRetrySpecies}>
            Tentar novamente
          </Button>
        </View>
      )}
      {!visible.length && (
        <View style={s.notice}>
          <Text style={ui.subtitle}>
            Nenhuma seção encontrada. Tente outro termo.
          </Text>
        </View>
      )}
      {visible.map((section) => {
        const isOpen = expanded(section.key);
        const { Icon } = section;
        const count =
          Object.keys(section.pokemonData).length +
          Object.keys(section.speciesData).length;
        return (
          <View key={section.key} style={s.section}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={section.title}
              accessibilityState={{ expanded: isOpen }}
              onPress={() => {
                if (query) {
                  setSearch("");
                  setOpen(
                    new Set(
                      visible
                        .filter((group) => group.key !== section.key)
                        .map((group) => group.key),
                    ),
                  );
                } else
                  setOpen((previous) => {
                    const next = new Set(previous);
                    if (next.has(section.key)) next.delete(section.key);
                    else next.add(section.key);
                    return next;
                  });
              }}
              style={({ pressed }) => [
                s.sectionHeader,
                pressed && { backgroundColor: c.surfaceHover },
              ]}
            >
              <View style={s.icon}>
                <Icon size={21} color={c.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <Text style={s.sectionTitle}>{section.title}</Text>
                <Text style={s.sectionDescription}>{section.description}</Text>
              </View>
              <Text style={s.counter}>{count}</Text>
              {isOpen ? (
                <ChevronDown size={18} color={c.accent} />
              ) : (
                <ChevronRight size={18} color={c.muted} />
              )}
            </Pressable>
            {isOpen && (
              <View style={[s.sectionBody, mobile && { padding: 12 }]}>
                {section.key === "battle" && (
                  <View style={s.highlight}>
                    <Text style={s.blockTitle}>ESTATÍSTICAS BASE</Text>
                    <Stats pokemon={pokemon} />
                  </View>
                )}
                {section.key === "images" && <Sprites pokemon={pokemon} />}
                <View
                  style={{
                    flexDirection:
                      mobile ||
                      section.key === "moves" ||
                      section.key === "images"
                        ? "column"
                        : "row",
                    gap: 16,
                    alignItems: "stretch",
                  }}
                >
                  {Object.keys(section.pokemonData).length > 0 && (
                    <View style={s.dataBlock}>
                      <Text style={s.blockTitle}>
                        {section.key === "images"
                          ? "ARQUIVOS E VERSÕES"
                          : "DADOS DO POKÉMON"}
                      </Text>
                      <ResourceData
                        data={section.pokemonData}
                        includeIdentity
                      />
                    </View>
                  )}
                  {Object.keys(section.speciesData).length > 0 && (
                    <View style={s.dataBlock}>
                      <Text style={s.blockTitle}>DADOS DA ESPÉCIE</Text>
                      <ResourceData
                        data={section.speciesData}
                        includeIdentity
                      />
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hero: {
      padding: 24,
      gap: 20,
      borderRadius: 20,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
    },
    art: {
      width: 84,
      height: 84,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accentSoft,
      borderRadius: 20,
    },
    eyebrow: {
      ...font,
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 1.1,
      color: c.accent,
    },
    metrics: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 10,
    },
    metric: {
      padding: 14,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      gap: 7,
    },
    metricLabel: {
      ...font,
      fontSize: 9,
      fontWeight: "600",
      color: c.muted,
      letterSpacing: 0.5,
    },
    metricValue: { ...font, fontSize: 22, fontWeight: "800", color: c.ink },
    sectionCount: { ...font, fontSize: 11, fontWeight: "600", color: c.muted },
    notice: {
      padding: 18,
      borderRadius: 14,
      backgroundColor: c.surfaceAlt,
      gap: 12,
    },
    section: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
      overflow: "hidden",
    },
    sectionHeader: {
      padding: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    icon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accentSoft,
    },
    sectionTitle: { ...font, fontSize: 14, fontWeight: "700", color: c.ink },
    sectionDescription: {
      ...font,
      fontSize: 11,
      lineHeight: 17,
      color: c.muted,
    },
    counter: {
      ...font,
      fontSize: 10,
      fontWeight: "700",
      color: c.accent,
      backgroundColor: c.accentSoft,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 8,
    },
    sectionBody: {
      padding: 18,
      gap: 20,
      borderTopWidth: 1,
      borderTopColor: c.line,
      backgroundColor: c.surfaceAlt,
    },
    dataBlock: { flex: 1, minWidth: 0, gap: 10 },
    blockTitle: {
      ...font,
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 1,
      color: c.muted,
    },
    highlight: {
      padding: 16,
      borderRadius: 14,
      backgroundColor: c.surface,
      gap: 14,
    },
  });
