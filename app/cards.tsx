import React, { useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useQueries } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import {
  Art,
  Button,
  Empty,
  Loading,
  SearchInput,
  Select,
} from "../src/components/ui";
import { useTheme } from "../src/theme";
import { currentLanguage } from "../src/i18n/locale";
import { CardDetail, CollectionLogo } from "../src/features/pokemon/PokemonTcg";
import {
  cardImage,
  getTcgSeries,
  getTcgSeriesDetail,
  getTcgSet,
  getTcgSetsByRelease,
  tcgSeriesOrder,
  tcgAsset,
  tcgLanguage,
  tcgLanguagesForLocale,
  type TcgCard,
  type TcgSeries,
  type TcgCollection,
} from "../src/services/tcg";

const languages = [
  { value: "pt-br", label: "Português" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "zh-tw", label: "中文（繁體）" },
  { value: "id", label: "Bahasa Indonesia" },
  { value: "th", label: "ไทย" },
];
type Localized<T> = T & { language: string; languages: string[] };
function merge<T extends { id: string }>(
  sources: { language: string; entries: T[] }[],
  preferred: string,
): Localized<T>[] {
  const rank = (value: string) =>
    value === preferred ? 0 : value === "en" ? 1 : 2;
  const unique = new Map<string, Localized<T>>();
  for (const source of [...sources].sort(
    (a, b) => rank(a.language) - rank(b.language),
  ))
    for (const entry of source.entries) {
      const previous = unique.get(entry.id);
      if (previous) {
        const previousMedia = previous as {
          logo?: string | null;
          symbol?: string | null;
        };
        const media = entry as { logo?: string | null; symbol?: string | null };
        if (!previousMedia.logo && media.logo) previousMedia.logo = media.logo;
        if (!previousMedia.symbol && media.symbol)
          previousMedia.symbol = media.symbol;
        if (!previous.languages.includes(source.language))
          previous.languages.push(source.language);
      } else
        unique.set(entry.id, {
          ...entry,
          language: source.language,
          languages: [source.language],
        });
    }
  return [...unique.values()];
}
function Status({
  queries,
}: {
  queries: { isPending: boolean; isError: boolean; refetch: () => unknown }[];
}) {
  const { ui } = useTheme();
  const pending = queries.some((query) => query.isPending);
  const errors = queries.filter((query) => query.isError);
  return (
    <View style={{ gap: 8 }}>
      {pending && <Text style={ui.subtitle}>Carregando catálogos…</Text>}
      {!!errors.length && (
        <>
          <Text style={ui.subtitle}>
            Alguns catálogos não responderam. A lista pode estar incompleta.
          </Text>
          <Button
            small
            variant="outline"
            onPress={() => {
              for (const query of errors) void query.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </>
      )}
    </View>
  );
}
function Section({
  title,
  subtitle,
  image,
  logo,
  children,
}: {
  title: string;
  subtitle: string;
  image?: string;
  logo?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { ui, colors: c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 14,
        backgroundColor: c.surface,
        overflow: "hidden",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => ({
          padding: 16,
          flexDirection: "row",
          gap: 12,
          alignItems: "center",
          backgroundColor: pressed ? c.surfaceHover : c.surface,
        })}
      >
        {logo ?? (
          <CollectionLogo key={image ?? title} uri={image} name={title} />
        )}
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={[ui.sectionTitle, { fontSize: 16 }]}>{title}</Text>
          <Text style={[ui.subtitle, { fontSize: 11 }]}>{subtitle}</Text>
        </View>
        {open ? (
          <ChevronDown size={19} color={c.accent} />
        ) : (
          <ChevronRight size={19} color={c.muted} />
        )}
      </Pressable>
      {open && (
        <View
          style={{
            padding: 12,
            gap: 14,
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
export default function CardsRoute() {
  const { ui } = useTheme();
  const [language, setLanguage] = useState("all");
  const [search, setSearch] = useState("");
  const preferred = tcgLanguage(currentLanguage());
  const availableLanguages = tcgLanguagesForLocale(
    languages,
    currentLanguage(),
  );
  const selected =
    language === "all"
      ? availableLanguages
      : availableLanguages.filter((entry) => entry.value === language);
  const queries = useQueries({
    queries: selected.map(({ value }) => ({
      queryKey: ["tcg-series", value],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getTcgSeries(value, signal),
      staleTime: 86400000,
      retry: 1,
    })),
  });
  const series = merge(
    queries.map((query, index) => ({
      language: selected[index].value,
      entries: query.data ?? [],
    })),
    preferred,
  );
  const visible = series
    .sort((a, b) => tcgSeriesOrder(b.id) - tcgSeriesOrder(a.id))
    .filter((item) =>
      (item.name + " " + item.id)
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    );
  return (
    <View style={ui.page}>
      <Text style={ui.title}>Cartas Pokémon TCG</Text>
      <Text style={ui.subtitle}>
        Explore as séries e suas coleções. Abra uma coleção para ver todas as
        cartas.
      </Text>
      <View style={[ui.wrap, { alignItems: "center" }]}>
        <View style={{ minWidth: 180, flex: 1 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar série: SV, Mega, SWSH…"
          />
        </View>
        <View style={{ minWidth: 180 }}>
          <Select
            label="Idioma"
            value={language}
            options={[
              { value: "all", label: "Todos os idiomas" },
              ...availableLanguages,
            ]}
            onChange={setLanguage}
          />
        </View>
      </View>
      <Status queries={queries} />
      {queries.every((query) => query.isPending) && (
        <Loading text="Carregando séries…" />
      )}
      {!visible.length && queries.every((query) => query.isSuccess) && (
        <Empty
          title="Nenhuma série encontrada"
          description="Tente outro termo ou idioma."
        />
      )}
      {visible.map((serie) => (
        <Section
          key={language + ":" + serie.id}
          title={serie.name}
          subtitle={serie.id.toUpperCase() + " · Coleções"}
          image={tcgAsset(serie.logo)}
          logo={<SeriesLogo serie={serie} />}
        >
          <SeriesCollections serie={serie} preferred={preferred} />
        </Section>
      ))}
      <Text style={ui.subtitle}>Dados e imagens: TCGdex</Text>
    </View>
  );
}
function SeriesLogo({ serie }: { serie: Localized<TcgSeries> }) {
  const [loadFallback, setLoadFallback] = useState(!tcgAsset(serie.logo));
  const sources = [...new Set([serie.language, "en"])];
  const queries = useQueries({
    queries: sources.map((language) => ({
      queryKey: ["tcg-series-detail", language, serie.id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getTcgSeriesDetail(serie.id, language, signal),
      enabled: loadFallback,
      staleTime: 86400000,
      retry: 1,
    })),
  });
  const fallbackUris = queries
    .flatMap((query) => [
      tcgAsset(query.data?.logo),
      ...(query.data?.sets ?? []).map((set) =>
        tcgAsset(set.logo ?? set.symbol),
      ),
    ])
    .filter((value): value is string => !!value);
  return (
    <CollectionLogo
      uri={tcgAsset(serie.logo)}
      name={serie.name}
      fallbackUris={fallbackUris}
      onUnavailable={() => setLoadFallback(true)}
    />
  );
}

function SeriesCollections({
  serie,
  preferred,
}: {
  serie: Localized<TcgSeries>;
  preferred: string;
}) {
  const releaseQueries = useQueries({
    queries: serie.languages.map((language) => ({
      queryKey: ["tcg-sets-release-desc", language],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getTcgSetsByRelease(language, signal),
      staleTime: 86400000,
      retry: 1,
    })),
  });
  const queries = useQueries({
    queries: serie.languages.map((language) => ({
      queryKey: ["tcg-series-detail", language, serie.id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getTcgSeriesDetail(serie.id, language, signal),
      staleTime: 86400000,
      retry: 1,
    })),
  });
  const sets = merge(
    queries.map((query, index) => ({
      language: serie.languages[index],
      entries: query.data?.sets ?? [],
    })),
    preferred,
  );
  const { ui } = useTheme();
  const releaseRank = (set: Localized<TcgCollection>) => {
    const preferredIndex = serie.languages.indexOf(preferred);
    const indexes = [
      ...new Set([
        preferredIndex,
        serie.languages.indexOf("en"),
        ...serie.languages.map((_, index) => index),
      ]),
    ].filter((index) => index >= 0);
    for (const index of indexes) {
      const rank = releaseQueries[index].data?.findIndex(
        (entry) => entry.id === set.id,
      );
      if (rank !== undefined && rank >= 0) return rank;
    }
    return Number.MAX_SAFE_INTEGER;
  };
  sets.sort(
    (a, b) =>
      releaseRank(a) - releaseRank(b) ||
      b.id.localeCompare(a.id, undefined, { numeric: true }),
  );
  return (
    <>
      <Status queries={[...queries, ...releaseQueries]} />
      <Text style={ui.subtitle}>{sets.length} coleções</Text>
      {sets.map((set) => (
        <Section
          key={set.id}
          title={set.name}
          subtitle={
            set.id.toUpperCase() +
            (set.cardCount?.total != null
              ? " · " + set.cardCount.total + " cartas"
              : "")
          }
          image={tcgAsset(set.logo ?? set.symbol)}
          logo={
            <CollectionLogo
              uri={tcgAsset(set.logo)}
              name={set.name}
              fallbackUris={queries
                .flatMap(
                  (query) =>
                    query.data?.sets
                      .filter((item) => item.id === set.id)
                      .flatMap((item) => [
                        tcgAsset(item.logo),
                        tcgAsset(item.symbol),
                      ]) ?? [],
                )
                .filter((uri): uri is string => !!uri)}
            />
          }
        >
          <CollectionCards collection={set} preferred={preferred} />
        </Section>
      ))}
      {!sets.length && queries.every((query) => query.isSuccess) && (
        <Text style={ui.subtitle}>Nenhuma coleção disponível nesta série.</Text>
      )}
    </>
  );
}
function CollectionCards({
  collection,
  preferred,
}: {
  collection: Localized<TcgCollection>;
  preferred: string;
}) {
  const { ui, colors: c } = useTheme();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Localized<TcgCard> | null>(null);
  const queries = useQueries({
    queries: collection.languages.map((language) => ({
      queryKey: ["tcg-set", language, collection.id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getTcgSet(collection.id, language, signal),
      staleTime: 86400000,
      retry: 1,
    })),
  });
  const cards = merge(
    queries.map((query, index) => ({
      language: collection.languages[index],
      entries: query.data?.cards ?? [],
    })),
    preferred,
  ).sort((a, b) =>
    a.localId.localeCompare(b.localId, undefined, { numeric: true }),
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(cards.length / 24) - 1),
  );
  const visible = cards.slice(currentPage * 24, (currentPage + 1) * 24);
  const columns = width < 550 ? 2 : width < 900 ? 3 : width < 1200 ? 4 : 5;
  return (
    <>
      <Status queries={queries} />
      <Text style={ui.subtitle}>{cards.length} cartas</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -5 }}>
        {visible.map((card) => (
          <View
            key={card.id}
            style={{ width: `${100 / columns}%`, padding: 5 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ampliar ${card.name} #${card.localId}`}
              onPress={() => setSelected(card)}
              style={({ pressed }) => ({
                padding: 8,
                gap: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.line,
                backgroundColor: c.surfaceAlt,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Art
                name={card.name}
                uri={cardImage(card)}
                style={{ width: "100%", aspectRatio: 600 / 825 }}
              />
              <Text
                style={{ color: c.ink, fontWeight: "700", fontSize: 12 }}
                numberOfLines={2}
              >
                {card.name}
              </Text>
              <Text style={[ui.subtitle, { fontSize: 10 }]}>
                #{card.localId} ·{" "}
                {languages.find((l) => l.value === card.language)?.label}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
      {!cards.length && queries.every((query) => query.isSuccess) && (
        <Text style={ui.subtitle}>Nenhuma carta disponível nesta coleção.</Text>
      )}
      {cards.length > 24 && (
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
            {currentPage + 1} / {Math.ceil(cards.length / 24)}
          </Text>
          <Button
            small
            variant="outline"
            disabled={(currentPage + 1) * 24 >= cards.length}
            onPress={() => setPage(currentPage + 1)}
          >
            Próxima
          </Button>
        </View>
      )}
      <Modal
        transparent
        visible={!!selected}
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View
          style={{
            flex: 1,
            padding: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.8)",
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 570,
              maxHeight: "94%",
              backgroundColor: c.surface,
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            <View style={{ padding: 10, alignItems: "flex-end" }}>
              <Button small variant="ghost" onPress={() => setSelected(null)}>
                Fechar
              </Button>
            </View>
            {selected && (
              <CardDetail
                key={selected.language + selected.id}
                card={selected}
                language={selected.language}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
