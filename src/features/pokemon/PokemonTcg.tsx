import React, { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { ChevronDown, ChevronRight, Layers } from "lucide-react-native";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useTheme } from "../../theme";
import {
  Art,
  Button,
  Empty,
  ErrorState,
  Loading,
  Select,
} from "../../components/ui";
import { currentLanguage } from "../../i18n/locale";
import {
  cardImage,
  getPokemonCards,
  getTcgCard,
  getTcgSets,
  tcgLanguage,
  tcgAsset,
  tcgLanguagesForLocale,
  type TcgCard,
} from "../../services/tcg";

const languages = [
  { value: "pt-br", label: "Português" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "ja", label: "日本語" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "zh-tw", label: "中文（繁體）" },
  { value: "id", label: "Bahasa Indonesia" },
  { value: "th", label: "ไทย" },
];
type CatalogCard = TcgCard & { language: string };
export function PokemonTcg({ speciesId }: { speciesId: number }) {
  const { colors: c, ui } = useTheme();
  const { width } = useWindowDimensions();
  const [language, setLanguage] = useState("all");
  const [collection, setCollection] = useState("all");
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<CatalogCard | null>(null);
  const preferred = tcgLanguage(currentLanguage());
  const availableLanguages = tcgLanguagesForLocale(
    languages,
    currentLanguage(),
  );
  const cardQueries = useQueries({
    queries: availableLanguages.map(({ value }) => ({
      queryKey: ["pokemon-tcg-all-v2", speciesId, value],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getPokemonCards(speciesId, value, signal),
      staleTime: 24 * 60 * 60 * 1000,
      retry: 1,
    })),
  });
  const setQueries = useQueries({
    queries: availableLanguages.map(({ value }, index) => ({
      queryKey: ["tcg-sets", value],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getTcgSets(value, signal),
      enabled: !!cardQueries[index].data?.cards.length,
      staleTime: 24 * 60 * 60 * 1000,
    })),
  });
  const allCards = useMemo(() => {
    const ordered = cardQueries
      .flatMap((query) =>
        (query.data?.cards ?? []).map((card) => ({
          ...card,
          language: query.data!.language,
        })),
      )
      .filter((card) => language === "all" || card.language === language)
      .sort((a, b) => {
        const rank = (value: string) =>
          value === preferred ? 0 : value === "en" ? 1 : 2;
        return rank(a.language) - rank(b.language);
      });
    const unique = new Map<string, CatalogCard>();
    for (const card of ordered)
      if (!unique.has(card.id)) unique.set(card.id, card);
    return [...unique.values()].sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true }),
    );
  }, [cardQueries, language, preferred]);
  const setId = (card: TcgCard) => card.id.slice(0, card.id.lastIndexOf("-"));
  const setName = (id: string, cardLanguage: string) => {
    const index = availableLanguages.findIndex(
      (entry) => entry.value === cardLanguage,
    );
    return setQueries[index]?.data?.find((set) => set.id === id)?.name ?? id;
  };
  const collections = [...new Set(allCards.map(setId))]
    .map((id) => {
      const card = allCards.find((card) => setId(card) === id)!;
      const index = availableLanguages.findIndex(
        (entry) => entry.value === card.language,
      );
      const preferredSet = setQueries[index]?.data?.find(
        (set) => set.id === id,
      );
      const otherSets = setQueries
        .flatMap((query) => query.data ?? [])
        .filter((set) => set.id === id);
      const logo =
        preferredSet?.logo ?? otherSets.find((set) => set.logo)?.logo;
      const symbol =
        preferredSet?.symbol ?? otherSets.find((set) => set.symbol)?.symbol;
      const asset = logo ?? symbol;
      const image =
        asset && /^https:\/\/assets\.tcgdex\.net\//.test(asset)
          ? /\.(png|webp|jpg)$/i.test(asset)
            ? asset
            : asset + ".png"
          : undefined;
      const fallbackUris = otherSets
        .flatMap((set) => [tcgAsset(set.logo), tcgAsset(set.symbol)])
        .filter((uri): uri is string => !!uri);
      return {
        value: id,
        label: setName(id, card.language),
        image,
        fallbackUris,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  const list =
    collection === "all"
      ? allCards
      : allCards.filter((card) => setId(card) === collection);
  const pending = cardQueries.some((query) => query.isPending);
  const failed = cardQueries.filter((query) => query.isError);
  const reload = () => {
    for (const query of cardQueries) if (query.isError) void query.refetch();
  };
  const groups = collections.filter(
    (item) => collection === "all" || item.value === collection,
  );
  const columns = width < 520 ? 2 : width < 850 ? 3 : width < 1200 ? 4 : 5;
  return (
    <View style={{ gap: 20 }}>
      <View style={[ui.between, { flexWrap: "wrap", gap: 12 }]}>
        <View style={{ gap: 6, flex: 1, minWidth: 180 }}>
          <Text style={ui.sectionTitle}>Cartas Pokémon TCG</Text>
          <Text style={ui.subtitle}>
            Explore as coleções disponíveis desta espécie para o idioma do app.
            Toque em uma carta para ampliar.
          </Text>
        </View>
        <View style={{ minWidth: 160 }}>
          <Select
            label="Idioma das cartas"
            value={language}
            options={[
              { value: "all", label: "Todos os idiomas" },
              ...availableLanguages,
            ]}
            onChange={(value) => {
              setLanguage(value);
              setCollection("all");
              setSelected(null);
            }}
          />
        </View>
      </View>
      <Select
        label="Coleção"
        value={collection}
        options={[{ value: "all", label: "Todas as coleções" }, ...collections]}
        onChange={(value) => {
          setCollection(value);
        }}
      />
      {pending && list.length > 0 && (
        <Text style={ui.subtitle}>Buscando outras coleções…</Text>
      )}
      {failed.length > 0 && list.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={ui.subtitle}>
            Alguns catálogos não responderam. A lista ainda pode estar
            incompleta.
          </Text>
          <Button small variant="outline" onPress={reload}>
            Tentar catálogos restantes
          </Button>
        </View>
      )}
      {pending && !list.length ? (
        <Loading text="Buscando cartas em todas as coleções…" />
      ) : failed.length > 0 && !list.length ? (
        <ErrorState retry={reload} />
      ) : !list.length ? (
        <Empty
          title="Nenhuma carta encontrada"
          description="Ainda não há cartas desta espécie disponíveis no catálogo consultado."
        />
      ) : (
        <>
          <Text style={ui.subtitle}>
            {list.length} cartas ·{" "}
            {collection === "all"
              ? collections.length + " coleções"
              : collections.find((item) => item.value === collection)?.label}
          </Text>
          <View style={ui.wrap}>
            <Button
              small
              variant="outline"
              onPress={() =>
                setOpen(new Set(groups.map((group) => group.value)))
              }
            >
              Expandir tudo
            </Button>
            <Button small variant="ghost" onPress={() => setOpen(new Set())}>
              Recolher tudo
            </Button>
          </View>
          {groups.map((group) => {
            const expanded = open.has(group.value);
            const groupCards = list
              .filter((card) => setId(card) === group.value)
              .sort((a, b) =>
                a.localId.localeCompare(b.localId, undefined, {
                  numeric: true,
                }),
              );
            return (
              <View
                key={group.value}
                style={{
                  borderWidth: 1,
                  borderColor: c.line,
                  borderRadius: 14,
                  overflow: "hidden",
                  backgroundColor: c.surface,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={group.label}
                  accessibilityState={{ expanded }}
                  onPress={() =>
                    setOpen((previous) => {
                      const next = new Set(previous);
                      if (next.has(group.value)) next.delete(group.value);
                      else next.add(group.value);
                      return next;
                    })
                  }
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 16,
                    backgroundColor: pressed ? c.surfaceHover : c.surface,
                  })}
                >
                  <CollectionLogo
                    key={group.image ?? group.value}
                    uri={group.image}
                    fallbackUris={group.fallbackUris}
                    name={group.label}
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[ui.sectionTitle, { fontSize: 15 }]}>
                      {group.label}
                    </Text>
                    <Text style={[ui.subtitle, { fontSize: 11 }]}>
                      {groupCards.length}{" "}
                      {groupCards.length === 1 ? "carta" : "cartas"} ·{" "}
                      {group.value}
                    </Text>
                  </View>
                  {expanded ? (
                    <ChevronDown size={18} color={c.accent} />
                  ) : (
                    <ChevronRight size={18} color={c.muted} />
                  )}
                </Pressable>
                {expanded && (
                  <View
                    style={{
                      padding: width < 650 ? 10 : 16,
                      borderTopWidth: 1,
                      borderTopColor: c.line,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        margin: -6,
                      }}
                    >
                      {groupCards.map((card) => {
                        const collectionName = setName(
                          setId(card),
                          card.language,
                        );
                        return (
                          <View
                            key={card.language + ":" + card.id}
                            style={{ width: `${100 / columns}%`, padding: 6 }}
                          >
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Ampliar carta ${card.name}, ${collectionName}, ${card.localId}`}
                              onPress={() => setSelected(card)}
                              style={({ pressed }) => [
                                ui.panel,
                                {
                                  padding: 10,
                                  gap: 10,
                                  opacity: pressed ? 0.75 : 1,
                                  borderColor: c.line,
                                },
                              ]}
                            >
                              <Art
                                name={card.name}
                                uri={cardImage(card)}
                                style={{
                                  width: "100%",
                                  aspectRatio: 600 / 825,
                                }}
                              />
                              <View style={{ gap: 4 }}>
                                <Text
                                  style={{
                                    color: c.ink,
                                    fontWeight: "700",
                                    fontSize: 13,
                                  }}
                                  numberOfLines={2}
                                >
                                  {card.name}
                                </Text>
                                <Text
                                  style={[ui.subtitle, { fontSize: 11 }]}
                                  numberOfLines={2}
                                >
                                  {collectionName}
                                </Text>
                                <Text style={[ui.subtitle, { fontSize: 10 }]}>
                                  #{card.localId} ·{" "}
                                  {
                                    languages.find(
                                      (item) => item.value === card.language,
                                    )?.label
                                  }
                                </Text>
                              </View>
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}
      <Button
        small
        variant="ghost"
        onPress={() => {
          void Linking.openURL("https://tcgdex.net").catch(() => {});
        }}
      >
        Dados e imagens: TCGdex ↗
      </Button>
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.8)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: 20,
              width: "100%",
              maxWidth: 570,
              maxHeight: "94%",
              overflow: "hidden",
            }}
          >
            <View style={{ alignItems: "flex-end", padding: 10 }}>
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
    </View>
  );
}
export function CollectionLogo({
  uri,
  name,
  fallbackUris = [],
  onUnavailable,
}: {
  uri?: string;
  name: string;
  fallbackUris?: string[];
  onUnavailable?: () => void;
}) {
  const { colors: c } = useTheme();
  const candidates = [
    ...new Set(
      [uri, ...fallbackUris].filter((value): value is string => !!value),
    ),
  ];
  const [index, setIndex] = useState(0);
  const candidateKey = candidates.join("|");
  useEffect(() => setIndex(0), [candidateKey]);
  const image = candidates[index];
  return (
    <View
      style={{
        width: 88,
        height: 52,
        borderRadius: 8,
        backgroundColor: image ? "#FFFFFF" : c.surfaceAlt,
        alignItems: "center",
        justifyContent: "center",
        padding: 5,
      }}
    >
      {image ? (
        <Image
          key={image}
          source={{ uri: image }}
          accessibilityLabel={`Logo da coleção ${name}`}
          resizeMode="contain"
          onError={() => {
            if (index + 1 >= candidates.length) onUnavailable?.();
            setIndex((value) => value + 1);
          }}
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <Layers size={24} color={c.accent} />
      )}
    </View>
  );
}

export function CardDetail({
  card,
  language,
}: {
  card: TcgCard;
  language: string;
}) {
  const { ui } = useTheme();
  const detail = useQuery({
    queryKey: ["tcg-card", language, card.id],
    queryFn: ({ signal }) => getTcgCard(card.id, language, signal),
    staleTime: 24 * 60 * 60 * 1000,
  });
  return (
    <ScrollView
      contentContainerStyle={{ padding: 18, gap: 12, alignItems: "center" }}
    >
      <Art
        name={card.name}
        uri={cardImage(detail.data ?? card, true)}
        style={{ width: "100%", aspectRatio: 600 / 825, maxHeight: 600 }}
      />
      <Text style={ui.sectionTitle}>{detail.data?.name ?? card.name}</Text>
      <Text style={ui.subtitle}>
        {detail.data?.set?.name ?? card.id} · #{card.localId}
      </Text>
      {detail.isPending && (
        <Text style={ui.subtitle}>Carregando detalhes…</Text>
      )}
      {detail.isError && (
        <Button
          small
          variant="outline"
          onPress={() => {
            void detail.refetch();
          }}
        >
          Recarregar detalhes
        </Button>
      )}
      {!!detail.data?.rarity && (
        <Text style={ui.subtitle}>Raridade: {detail.data.rarity}</Text>
      )}
      {!!detail.data?.illustrator && (
        <Text style={ui.subtitle}>Ilustração: {detail.data.illustrator}</Text>
      )}
      {!!detail.data?.hp && (
        <Text style={ui.subtitle}>HP: {detail.data.hp}</Text>
      )}
    </ScrollView>
  );
}
